-- ============================================================
--  AdaptIQ — PostgreSQL Database Schema
--  Run this file once against a fresh PostgreSQL database:
--    psql -U postgres -d adaptiq -f adaptiq_schema.sql
-- ============================================================

-- Enable the uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing (optional, bcrypt done in app)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE users (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    username      VARCHAR(50)   NOT NULL UNIQUE,
    email         VARCHAR(100)  NOT NULL UNIQUE,
    password_hash TEXT          NOT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. SUBJECTS
-- ============================================================
CREATE TABLE subjects (
    id   SERIAL      PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- ============================================================
-- 3. TOPICS
-- ============================================================
CREATE TABLE topics (
    id         SERIAL      PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    subject_id INTEGER      NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE (name, subject_id)
);

-- ============================================================
-- 4. QUIZZES
-- ============================================================
CREATE TABLE quizzes (
    id         SERIAL       PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    topic_id   INTEGER      NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. QUESTIONS
-- ============================================================
CREATE TABLE questions (
    id            SERIAL       PRIMARY KEY,
    quiz_id       INTEGER      NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT         NOT NULL,
    options       JSONB        NOT NULL,   -- e.g. ["Option A","Option B","Option C","Option D"]
    correct_index INTEGER      NOT NULL,   -- 0-based index into options array
    topic_id      INTEGER      NOT NULL REFERENCES topics(id) ON DELETE CASCADE
);

-- ============================================================
-- 6. QUIZ ATTEMPTS
-- ============================================================
CREATE TABLE quiz_attempts (
    id              SERIAL    PRIMARY KEY,
    student_id      UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id         INTEGER   NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    score           INTEGER   NOT NULL DEFAULT 0,
    total_questions INTEGER   NOT NULL,
    topic_scores    JSONB     NOT NULL DEFAULT '{}', -- {"topic_id": percentage_float, ...}
    attempted_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. STUDY MATERIALS
-- ============================================================
CREATE TABLE study_materials (
    id            SERIAL       PRIMARY KEY,
    title         VARCHAR(200) NOT NULL,
    url           TEXT         NOT NULL,
    topic_id      INTEGER      NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    material_type VARCHAR(50)  NOT NULL DEFAULT 'article'
        CHECK (material_type IN ('quiz', 'article', 'video'))
);

-- ============================================================
-- 8. NOTES
-- ============================================================
CREATE TABLE notes (
    id             SERIAL       PRIMARY KEY,
    title          VARCHAR(200) NOT NULL,
    description    TEXT         NOT NULL DEFAULT '',
    file_path      TEXT         NOT NULL,
    subject        VARCHAR(100) NOT NULL DEFAULT '',
    course         VARCHAR(100) NOT NULL DEFAULT '',
    topic          VARCHAR(100) NOT NULL DEFAULT '',
    uploader_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    average_rating FLOAT        NOT NULL DEFAULT 0.0,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- Full-text search vector (auto-updated via trigger)
    search_vector  TSVECTOR
);

-- ============================================================
-- 9. REVIEWS
-- ============================================================
CREATE TABLE reviews (
    id          SERIAL    PRIMARY KEY,
    note_id     INTEGER   NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    reviewer_id UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    star_rating INTEGER   NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
    text        TEXT      NOT NULL DEFAULT '',
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),

    -- One review per user per note
    UNIQUE (note_id, reviewer_id)
);

-- ============================================================
-- 10. DOCUMENTS  (Collaborative)
-- ============================================================
CREATE TABLE documents (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    title      VARCHAR(200) NOT NULL DEFAULT 'Untitled Document',
    content    TEXT         NOT NULL DEFAULT '',
    owner_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. DOCUMENT COLLABORATORS
-- ============================================================
CREATE TABLE document_collaborators (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    added_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (document_id, user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Speed up quiz lookup by topic
CREATE INDEX idx_quizzes_topic_id       ON quizzes(topic_id);

-- Speed up questions lookup per quiz
CREATE INDEX idx_questions_quiz_id      ON questions(quiz_id);

-- Speed up attempt history per student
CREATE INDEX idx_attempts_student_id    ON quiz_attempts(student_id);
CREATE INDEX idx_attempts_student_quiz  ON quiz_attempts(student_id, quiz_id);
CREATE INDEX idx_attempts_attempted_at  ON quiz_attempts(attempted_at);

-- Speed up notes listing by uploader
CREATE INDEX idx_notes_uploader_id      ON notes(uploader_id);

-- Speed up filter queries on notes
CREATE INDEX idx_notes_subject          ON notes(subject);
CREATE INDEX idx_notes_course           ON notes(course);
CREATE INDEX idx_notes_topic            ON notes(topic);
CREATE INDEX idx_notes_avg_rating       ON notes(average_rating DESC);

-- Speed up review lookup per note
CREATE INDEX idx_reviews_note_id        ON reviews(note_id);

-- Speed up document lookup by owner
CREATE INDEX idx_documents_owner_id     ON documents(owner_id);

-- Full-text search index on notes
CREATE INDEX idx_notes_search_vector    ON notes USING GIN(search_vector);

-- ============================================================
-- TRIGGER: Auto-update notes.search_vector on INSERT/UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION notes_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')),       'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.subject, '')),     'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.course, '')),      'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.topic, '')),       'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notes_search_vector
    BEFORE INSERT OR UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION notes_search_vector_update();

-- ============================================================
-- TRIGGER: Auto-update notes.average_rating on review INSERT/UPDATE/DELETE
-- ============================================================
CREATE OR REPLACE FUNCTION update_note_average_rating() RETURNS TRIGGER AS $$
DECLARE
    v_note_id INTEGER;
BEGIN
    -- Works for INSERT/UPDATE and DELETE
    IF TG_OP = 'DELETE' THEN
        v_note_id := OLD.note_id;
    ELSE
        v_note_id := NEW.note_id;
    END IF;

    UPDATE notes
    SET average_rating = COALESCE(
        (SELECT AVG(star_rating) FROM reviews WHERE note_id = v_note_id),
        0.0
    )
    WHERE id = v_note_id;

    RETURN NULL; -- AFTER trigger, return value ignored
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_avg_rating
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_note_average_rating();

-- ============================================================
-- TRIGGER: Auto-update documents.updated_at on UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEED DATA — Subjects & Topics
-- ============================================================
INSERT INTO subjects (name) VALUES
    ('Data Structures'),
    ('Object-Oriented Programming'),
    ('Algorithms'),
    ('Database Systems'),
    ('Operating Systems'),
    ('Software Engineering');

-- Data Structures Topics
INSERT INTO topics (name, subject_id) VALUES
    ('Arrays & Strings',        1),
    ('Linked Lists',            1),
    ('Stacks & Queues',         1),
    ('Trees & Binary Trees',    1),
    ('Graphs',                  1),
    ('Hashing',                 1);

-- OOP Topics
INSERT INTO topics (name, subject_id) VALUES
    ('Classes & Objects',       2),
    ('Inheritance',             2),
    ('Polymorphism',            2),
    ('Encapsulation',           2),
    ('Abstraction',             2),
    ('Design Patterns',         2);

-- Algorithms Topics
INSERT INTO topics (name, subject_id) VALUES
    ('Sorting Algorithms',      3),
    ('Searching Algorithms',    3),
    ('Dynamic Programming',     3),
    ('Greedy Algorithms',       3),
    ('Divide & Conquer',        3),
    ('Backtracking',            3);

-- Database Systems Topics
INSERT INTO topics (name, subject_id) VALUES
    ('SQL Basics',              4),
    ('Joins & Subqueries',      4),
    ('Normalization',           4),
    ('Transactions & ACID',     4),
    ('Indexing & Performance',  4);

-- Operating Systems Topics
INSERT INTO topics (name, subject_id) VALUES
    ('Processes & Threads',     5),
    ('Scheduling',              5),
    ('Memory Management',       5),
    ('Deadlocks',               5),
    ('File Systems',            5);

-- Software Engineering Topics
INSERT INTO topics (name, subject_id) VALUES
    ('SDLC Models',             6),
    ('Requirements Engineering',6),
    ('Software Design',         6),
    ('Testing & QA',            6),
    ('Agile & Scrum',           6);

-- ============================================================
-- SEED DATA — Sample Quizzes & Questions (Data Structures)
-- ============================================================

-- Quiz 1: Arrays & Strings
INSERT INTO quizzes (title, topic_id) VALUES ('Arrays & Strings Basics', 1);

INSERT INTO questions (quiz_id, question_text, options, correct_index, topic_id) VALUES
(1, 'What is the time complexity of accessing an element in an array by index?',
 '["O(n)","O(log n)","O(1)","O(n²)"]', 2, 1),

(1, 'Which of the following is NOT a property of an array?',
 '["Fixed size","Contiguous memory","Constant-time access","Dynamic resizing by default"]', 3, 1),

(1, 'What is the output of reversing the string "AdaptIQ"?',
 '["QItpadA","QITpadA","QItpadA","adaptiq"]', 0, 1),

(1, 'What is the space complexity of storing n elements in an array?',
 '["O(1)","O(log n)","O(n)","O(n²)"]', 2, 1),

(1, 'Which operation is most efficient for an array?',
 '["Insert at beginning","Delete from middle","Access by index","Search unsorted"]', 2, 1);


-- Quiz 2: Linked Lists
INSERT INTO quizzes (title, topic_id) VALUES ('Linked Lists Fundamentals', 2);

INSERT INTO questions (quiz_id, question_text, options, correct_index, topic_id) VALUES
(2, 'What is the time complexity of inserting at the head of a singly linked list?',
 '["O(n)","O(1)","O(log n)","O(n²)"]', 1, 2),

(2, 'Which pointer does the last node of a singly linked list point to?',
 '["Head","Itself","NULL","Previous node"]', 2, 2),

(2, 'What extra pointer does a doubly linked list have compared to singly linked list?',
 '["Next","Head","Previous","Tail"]', 2, 2),

(2, 'What is the time complexity of searching an element in a linked list?',
 '["O(1)","O(log n)","O(n)","O(n log n)"]', 2, 2),

(2, 'Which data structure uses a linked list internally by default?',
 '["Array","Stack","HashMap","Binary Tree"]', 1, 2);


-- Quiz 3: OOP — Classes & Objects
INSERT INTO quizzes (title, topic_id) VALUES ('Classes & Objects', 7);

INSERT INTO questions (quiz_id, question_text, options, correct_index, topic_id) VALUES
(3, 'What is a class in OOP?',
 '["An instance of an object","A blueprint for creating objects","A function","A variable"]', 1, 7),

(3, 'Which keyword is used to create an object in most OOP languages?',
 '["class","object","new","create"]', 2, 7),

(3, 'What is a constructor?',
 '["A method that destroys objects","A special method called when an object is created","A static method","An inherited method"]', 1, 7),

(3, 'Which of the following best describes encapsulation?',
 '["Inheriting properties from a parent","Hiding internal state and exposing only necessary parts","Creating multiple forms of a method","Defining abstract methods"]', 1, 7),

(3, 'What does "this" refer to inside a class method?',
 '["The parent class","The current instance","A static variable","The constructor"]', 1, 7);

-- ============================================================
-- SEED DATA — Study Materials
-- ============================================================
INSERT INTO study_materials (title, url, topic_id, material_type) VALUES
    ('Arrays Crash Course',          'https://www.youtube.com/watch?v=QFrJQq6Iox8', 1, 'video'),
    ('String Manipulation Guide',    'https://www.geeksforgeeks.org/string-data-structure/', 1, 'article'),
    ('Linked List Full Tutorial',    'https://www.youtube.com/watch?v=F8AbOfQwl1c', 2, 'video'),
    ('Stacks Explained',             'https://www.geeksforgeeks.org/stack-data-structure/', 3, 'article'),
    ('Binary Trees Visualized',      'https://www.youtube.com/watch?v=fAAZixBzIAI', 4, 'video'),
    ('Graph Theory Introduction',    'https://www.khanacademy.org/computing/computer-science/algorithms', 5, 'article'),
    ('OOP in Python',                'https://realpython.com/python3-object-oriented-programming/', 7, 'article'),
    ('Inheritance Deep Dive',        'https://www.youtube.com/watch?v=Ej_02ICOIgs', 8, 'video'),
    ('Sorting Algorithms Visualized','https://visualgo.net/en/sorting', 13, 'video'),
    ('Dynamic Programming Patterns', 'https://leetcode.com/discuss/general-discussion/458695', 15, 'article'),
    ('SQL Tutorial for Beginners',   'https://www.w3schools.com/sql/', 19, 'article'),
    ('Database Joins Explained',     'https://www.youtube.com/watch?v=9yeOJ0ZMUYw', 20, 'video'),
    ('Process Scheduling in OS',     'https://www.geeksforgeeks.org/cpu-scheduling-in-operating-systems/', 24, 'article'),
    ('Agile & Scrum Overview',       'https://www.atlassian.com/agile/scrum', 31, 'article');

-- ============================================================
-- USEFUL QUERIES FOR THE APPLICATION
-- ============================================================

-- Q1: Full-text search on notes with filters
-- (Used by GET /notes/?q=...&subject=...&course=...&topic=...)
/*
SELECT
    n.id, n.title, n.description, n.subject, n.course, n.topic,
    n.average_rating, n.created_at,
    u.username AS uploader
FROM notes n
JOIN users u ON u.id = n.uploader_id
WHERE
    (:query   IS NULL OR n.search_vector @@ plainto_tsquery('english', :query))
    AND (:subject IS NULL OR n.subject = :subject)
    AND (:course  IS NULL OR n.course  = :course)
    AND (:topic   IS NULL OR n.topic   = :topic)
ORDER BY
    CASE WHEN :query IS NOT NULL THEN ts_rank(n.search_vector, plainto_tsquery('english', :query)) END DESC,
    n.average_rating DESC
LIMIT 50;
*/

-- Q2: Get per-topic performance for a student (last 10 attempts)
-- (Used by GET /performance/summary)
/*
SELECT
    t.id   AS topic_id,
    t.name AS topic_name,
    s.name AS subject_name,
    AVG((qa.topic_scores->>(t.id::text))::float) AS avg_score
FROM quiz_attempts qa
JOIN quizzes q     ON q.id = qa.quiz_id
JOIN topics t      ON t.id = q.topic_id
JOIN subjects s    ON s.id = t.subject_id
WHERE qa.student_id = :student_id
  AND qa.attempted_at >= NOW() - INTERVAL '90 days'
GROUP BY t.id, t.name, s.name
ORDER BY avg_score ASC;
*/

-- Q3: Get weak topics (avg_score < 60%)
-- (Used by GET /performance/weak-topics)
/*
SELECT topic_id, topic_name, avg_score
FROM (
    SELECT
        t.id   AS topic_id,
        t.name AS topic_name,
        AVG((qa.topic_scores->>(t.id::text))::float) AS avg_score
    FROM quiz_attempts qa
    JOIN quizzes q ON q.id = qa.quiz_id
    JOIN topics  t ON t.id = q.topic_id
    WHERE qa.student_id = :student_id
    GROUP BY t.id, t.name
) performance
WHERE avg_score < 0.60
ORDER BY avg_score ASC;
*/

-- Q4: Progress over time per topic (for Recharts line chart)
-- (Used by GET /performance/progress)
/*
SELECT
    DATE(qa.attempted_at) AS attempt_date,
    t.name                AS topic_name,
    AVG(qa.score::float / NULLIF(qa.total_questions, 0)) AS daily_pct
FROM quiz_attempts qa
JOIN quizzes q ON q.id = qa.quiz_id
JOIN topics  t ON t.id = q.topic_id
WHERE qa.student_id = :student_id
GROUP BY DATE(qa.attempted_at), t.name
ORDER BY attempt_date ASC;
*/

-- Q5: Get recommended study materials for weak topics
-- (Fallback when ML model has no output)
/*
SELECT sm.id, sm.title, sm.url, sm.material_type, t.name AS topic_name
FROM study_materials sm
JOIN topics t ON t.id = sm.topic_id
WHERE sm.topic_id = ANY(:weak_topic_ids)
ORDER BY sm.topic_id;
*/

-- Q6: Get all documents accessible by a user (owned or collaborator)
-- (Used by GET /documents/)
/*
SELECT
    d.id, d.title, d.created_at, d.updated_at,
    u.username AS owner,
    CASE WHEN d.owner_id = :user_id THEN true ELSE false END AS is_owner
FROM documents d
JOIN users u ON u.id = d.owner_id
WHERE d.owner_id = :user_id
   OR EXISTS (
       SELECT 1 FROM document_collaborators dc
       WHERE dc.document_id = d.id AND dc.user_id = :user_id
   )
ORDER BY d.updated_at DESC;
*/

-- ============================================================
-- END OF SCHEMA
-- ============================================================

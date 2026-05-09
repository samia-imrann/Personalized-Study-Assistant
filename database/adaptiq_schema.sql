-- ============================================================
--  AdaptIQ — PostgreSQL Database Schema  v2
--  Changes from v1:
--    • Added difficulty level to questions
--    • Added description to study_materials
--    • Added answers_submitted to quiz_attempts (for review)
--    • Added subject_id / topic_id FK columns to notes (optional,
--      alongside free-text fields for flexibility)
--    • Added operation_log table for collab delta history
--    • Fixed missing indexes on study_materials and document_collaborators
--    • Fixed Q1–Q4 query edge cases (NULL topic_scores key, ordering)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
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
    id   SERIAL       PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- ============================================================
-- 3. TOPICS
-- ============================================================
CREATE TABLE topics (
    id         SERIAL       PRIMARY KEY,
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
--    topic_id here supports mixed-topic quizzes (e.g. a "Final
--    Exam" quiz spanning multiple topics). For single-topic quizzes
--    it will match quizzes.topic_id — keep both for flexibility.
-- ============================================================
CREATE TABLE questions (
    id            SERIAL      PRIMARY KEY,
    quiz_id       INTEGER     NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT        NOT NULL,
    options       JSONB       NOT NULL,       -- ["Option A","Option B","Option C","Option D"]
    correct_index INTEGER     NOT NULL,       -- 0-based index into options array
    topic_id      INTEGER     NOT NULL REFERENCES topics(id) ON DELETE CASCADE,

    -- FIX: difficulty helps the ML engine recommend appropriate-level quizzes
    difficulty    VARCHAR(10) NOT NULL DEFAULT 'medium'
        CHECK (difficulty IN ('easy', 'medium', 'hard'))
);

-- ============================================================
-- 6. QUIZ ATTEMPTS
--    FIX: answers_submitted added so students can review which
--         questions they got wrong (requirement F-02).
--         Format: [{"question_id": 1, "chosen_index": 2}, ...]
-- ============================================================
CREATE TABLE quiz_attempts (
    id                 SERIAL    PRIMARY KEY,
    student_id         UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id            INTEGER   NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    score              INTEGER   NOT NULL DEFAULT 0,
    total_questions    INTEGER   NOT NULL,
    topic_scores       JSONB     NOT NULL DEFAULT '{}',
    -- topic_scores format: {"<topic_id>": <percentage 0.0–1.0>, ...}
    answers_submitted  JSONB     NOT NULL DEFAULT '[]',
    attempted_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. STUDY MATERIALS
--    FIX: description added for better UX in recommendation results
-- ============================================================
CREATE TABLE study_materials (
    id            SERIAL       PRIMARY KEY,
    title         VARCHAR(200) NOT NULL,
    description   TEXT         NOT NULL DEFAULT '',   -- short summary shown to students
    url           TEXT         NOT NULL,
    topic_id      INTEGER      NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    material_type VARCHAR(50)  NOT NULL DEFAULT 'article'
        CHECK (material_type IN ('quiz', 'article', 'video'))
);

-- ============================================================
-- 8. NOTES
--    FIX: optional FK columns (subject_id, topic_id) added alongside
--         the free-text fields. Using FKs prevents typo mismatches in
--         search. The free-text fields are kept for backward compat
--         and for notes that don't map to a known subject/topic.
-- ============================================================
CREATE TABLE notes (
    id             SERIAL       PRIMARY KEY,
    title          VARCHAR(200) NOT NULL,
    description    TEXT         NOT NULL DEFAULT '',
    file_path      TEXT         NOT NULL,

    -- Free-text fields (kept for flexibility / user-entered values)
    subject        VARCHAR(100) NOT NULL DEFAULT '',
    course         VARCHAR(100) NOT NULL DEFAULT '',
    topic          VARCHAR(100) NOT NULL DEFAULT '',

    -- FIX: optional FK references for structured filtering
    subject_id     INTEGER      REFERENCES subjects(id) ON DELETE SET NULL,
    topic_id       INTEGER      REFERENCES topics(id)   ON DELETE SET NULL,

    uploader_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    average_rating FLOAT        NOT NULL DEFAULT 0.0,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
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
    document_id UUID      NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id     UUID      NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    added_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (document_id, user_id)
);

-- ============================================================
-- 12. DOCUMENT OPERATION LOG  (optional, for collab delta history)
--     Stores each edit delta so the collab service can replay history
--     or support undo. Can be pruned after DB persistence is confirmed.
-- ============================================================
CREATE TABLE document_operations (
    id          BIGSERIAL  PRIMARY KEY,
    document_id UUID       NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id     UUID       NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    delta       JSONB      NOT NULL,   -- OT/CRDT delta object from client
    applied_at  TIMESTAMP  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_quizzes_topic_id            ON quizzes(topic_id);
CREATE INDEX idx_questions_quiz_id           ON questions(quiz_id);
CREATE INDEX idx_questions_topic_id          ON questions(topic_id);
CREATE INDEX idx_questions_difficulty        ON questions(difficulty);

CREATE INDEX idx_attempts_student_id         ON quiz_attempts(student_id);
CREATE INDEX idx_attempts_student_quiz       ON quiz_attempts(student_id, quiz_id);
CREATE INDEX idx_attempts_attempted_at       ON quiz_attempts(attempted_at);

-- FIX: was missing in v1
CREATE INDEX idx_study_materials_topic_id    ON study_materials(topic_id);

CREATE INDEX idx_notes_uploader_id           ON notes(uploader_id);
CREATE INDEX idx_notes_subject               ON notes(subject);
CREATE INDEX idx_notes_course                ON notes(course);
CREATE INDEX idx_notes_topic                 ON notes(topic);
CREATE INDEX idx_notes_subject_id            ON notes(subject_id);
CREATE INDEX idx_notes_topic_id              ON notes(topic_id);
CREATE INDEX idx_notes_avg_rating            ON notes(average_rating DESC);
CREATE INDEX idx_notes_search_vector         ON notes USING GIN(search_vector);

CREATE INDEX idx_reviews_note_id             ON reviews(note_id);

CREATE INDEX idx_documents_owner_id          ON documents(owner_id);
CREATE INDEX idx_documents_updated_at        ON documents(updated_at DESC);

-- FIX: was missing in v1 — speeds up "all docs I collaborate on" query
CREATE INDEX idx_doc_collaborators_user_id   ON document_collaborators(user_id);

CREATE INDEX idx_doc_operations_document_id  ON document_operations(document_id);
CREATE INDEX idx_doc_operations_applied_at   ON document_operations(document_id, applied_at);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update notes.search_vector
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

-- Auto-update notes.average_rating
CREATE OR REPLACE FUNCTION update_note_average_rating() RETURNS TRIGGER AS $$
DECLARE
    v_note_id INTEGER;
BEGIN
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

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_avg_rating
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_note_average_rating();

-- Auto-update documents.updated_at
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

INSERT INTO questions (quiz_id, question_text, options, correct_index, topic_id, difficulty) VALUES
(1, 'What is the time complexity of accessing an element in an array by index?',
 '["O(n)","O(log n)","O(1)","O(n²)"]', 2, 1, 'easy'),

(1, 'Which of the following is NOT a property of an array?',
 '["Fixed size","Contiguous memory","Constant-time access","Dynamic resizing by default"]', 3, 1, 'easy'),

(1, 'What is the output of reversing the string "AdaptIQ"?',
 '["QItpadA","QITpadA","QItpadA","adaptiq"]', 0, 1, 'medium'),

(1, 'What is the space complexity of storing n elements in an array?',
 '["O(1)","O(log n)","O(n)","O(n²)"]', 2, 1, 'easy'),

(1, 'Which operation is most efficient for an array?',
 '["Insert at beginning","Delete from middle","Access by index","Search unsorted"]', 2, 1, 'medium');


-- Quiz 2: Linked Lists
INSERT INTO quizzes (title, topic_id) VALUES ('Linked Lists Fundamentals', 2);

INSERT INTO questions (quiz_id, question_text, options, correct_index, topic_id, difficulty) VALUES
(2, 'What is the time complexity of inserting at the head of a singly linked list?',
 '["O(n)","O(1)","O(log n)","O(n²)"]', 1, 2, 'easy'),

(2, 'Which pointer does the last node of a singly linked list point to?',
 '["Head","Itself","NULL","Previous node"]', 2, 2, 'easy'),

(2, 'What extra pointer does a doubly linked list have compared to singly linked list?',
 '["Next","Head","Previous","Tail"]', 2, 2, 'medium'),

(2, 'What is the time complexity of searching an element in a linked list?',
 '["O(1)","O(log n)","O(n)","O(n log n)"]', 2, 2, 'easy'),

(2, 'Which data structure uses a linked list internally by default?',
 '["Array","Stack","HashMap","Binary Tree"]', 1, 2, 'hard');


-- Quiz 3: OOP — Classes & Objects
INSERT INTO quizzes (title, topic_id) VALUES ('Classes & Objects', 7);

INSERT INTO questions (quiz_id, question_text, options, correct_index, topic_id, difficulty) VALUES
(3, 'What is a class in OOP?',
 '["An instance of an object","A blueprint for creating objects","A function","A variable"]', 1, 7, 'easy'),

(3, 'Which keyword is used to create an object in most OOP languages?',
 '["class","object","new","create"]', 2, 7, 'easy'),

(3, 'What is a constructor?',
 '["A method that destroys objects","A special method called when an object is created","A static method","An inherited method"]', 1, 7, 'medium'),

(3, 'Which of the following best describes encapsulation?',
 '["Inheriting properties from a parent","Hiding internal state and exposing only necessary parts","Creating multiple forms of a method","Defining abstract methods"]', 1, 7, 'medium'),

(3, 'What does "this" refer to inside a class method?',
 '["The parent class","The current instance","A static variable","The constructor"]', 1, 7, 'easy');

-- ============================================================
-- SEED DATA — Study Materials  (with descriptions added)
-- ============================================================
INSERT INTO study_materials (title, description, url, topic_id, material_type) VALUES
    ('Arrays Crash Course',
     'A fast-paced video covering array fundamentals, time complexities, and common operations.',
     'https://www.youtube.com/watch?v=QFrJQq6Iox8', 1, 'video'),

    ('String Manipulation Guide',
     'Comprehensive GeeksForGeeks article on string operations, patterns, and interview problems.',
     'https://www.geeksforgeeks.org/string-data-structure/', 1, 'article'),

    ('Linked List Full Tutorial',
     'Step-by-step video covering singly, doubly, and circular linked lists with code.',
     'https://www.youtube.com/watch?v=F8AbOfQwl1c', 2, 'video'),

    ('Stacks Explained',
     'GeeksForGeeks reference covering stack operations, use cases, and implementation.',
     'https://www.geeksforgeeks.org/stack-data-structure/', 3, 'article'),

    ('Binary Trees Visualized',
     'Visual walkthrough of binary tree traversals (inorder, preorder, postorder) with animations.',
     'https://www.youtube.com/watch?v=fAAZixBzIAI', 4, 'video'),

    ('Graph Theory Introduction',
     'Khan Academy module introducing graphs, BFS, DFS, and shortest path algorithms.',
     'https://www.khanacademy.org/computing/computer-science/algorithms', 5, 'article'),

    ('OOP in Python',
     'Real Python deep dive into classes, objects, inheritance, and magic methods.',
     'https://realpython.com/python3-object-oriented-programming/', 7, 'article'),

    ('Inheritance Deep Dive',
     'Video lesson explaining single and multiple inheritance with practical examples.',
     'https://www.youtube.com/watch?v=Ej_02ICOIgs', 8, 'video'),

    ('Sorting Algorithms Visualized',
     'Interactive VisuAlgo tool — watch bubble, merge, quick sort and more in real time.',
     'https://visualgo.net/en/sorting', 13, 'video'),

    ('Dynamic Programming Patterns',
     'Community-curated LeetCode discussion identifying the most common DP problem patterns.',
     'https://leetcode.com/discuss/general-discussion/458695', 15, 'article'),

    ('SQL Tutorial for Beginners',
     'W3Schools interactive SQL tutorial covering SELECT, WHERE, JOIN, GROUP BY and more.',
     'https://www.w3schools.com/sql/', 19, 'article'),

    ('Database Joins Explained',
     'Clear video explanation of INNER, LEFT, RIGHT, and FULL joins with Venn diagrams.',
     'https://www.youtube.com/watch?v=9yeOJ0ZMUYw', 20, 'video'),

    ('Process Scheduling in OS',
     'GeeksForGeeks article covering FCFS, SJF, Round Robin, and Priority scheduling algorithms.',
     'https://www.geeksforgeeks.org/cpu-scheduling-in-operating-systems/', 24, 'article'),

    ('Agile & Scrum Overview',
     'Atlassian''s official guide to Agile principles, Scrum ceremonies, and sprint planning.',
     'https://www.atlassian.com/agile/scrum', 31, 'article');


-- ============================================================
-- APPLICATION QUERIES  (fixed from v1)
-- ============================================================

-- Q1: Full-text search on notes with filters
--     FIX: ordering now uses a CASE that always returns a sortable value
--     FIX: ts_rank is computed only when a query is provided; otherwise
--          fall back to average_rating ordering to avoid NULL sort issues.
/*
SELECT
    n.id, n.title, n.description, n.subject, n.course, n.topic,
    n.average_rating, n.created_at,
    u.username AS uploader,
    CASE
        WHEN :query IS NOT NULL
        THEN ts_rank(n.search_vector, plainto_tsquery('english', :query))
        ELSE 0
    END AS relevance_score
FROM notes n
JOIN users u ON u.id = n.uploader_id
WHERE
    (:query   IS NULL OR n.search_vector @@ plainto_tsquery('english', :query))
    AND (:subject IS NULL OR n.subject    = :subject  OR n.subject_id = :subject_id)
    AND (:course  IS NULL OR n.course     = :course)
    AND (:topic   IS NULL OR n.topic      = :topic    OR n.topic_id   = :topic_id)
ORDER BY relevance_score DESC, n.average_rating DESC
LIMIT 50;
*/

-- Q2: Per-topic performance for a student (last 90 days)
--     FIX: COALESCE around the JSONB cast prevents NULL errors when a
--          topic key is absent from topic_scores for a given attempt.
/*
SELECT
    t.id   AS topic_id,
    t.name AS topic_name,
    s.name AS subject_name,
    AVG(
        COALESCE((qa.topic_scores->>(t.id::text))::float, 0.0)
    ) AS avg_score
FROM quiz_attempts qa
JOIN quizzes  q ON q.id = qa.quiz_id
JOIN topics   t ON t.id = q.topic_id
JOIN subjects s ON s.id = t.subject_id
WHERE qa.student_id = :student_id
  AND qa.attempted_at >= NOW() - INTERVAL '90 days'
GROUP BY t.id, t.name, s.name
ORDER BY avg_score ASC;
*/

-- Q3: Weak topics (avg_score < 60%)
--     FIX: same COALESCE fix as Q2
/*
SELECT topic_id, topic_name, avg_score
FROM (
    SELECT
        t.id   AS topic_id,
        t.name AS topic_name,
        AVG(
            COALESCE((qa.topic_scores->>(t.id::text))::float, 0.0)
        ) AS avg_score
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
--     FIX: added total_questions > 0 guard on top of existing NULLIF
/*
SELECT
    DATE(qa.attempted_at) AS attempt_date,
    t.name                AS topic_name,
    AVG(qa.score::float / NULLIF(qa.total_questions, 0)) AS daily_pct
FROM quiz_attempts qa
JOIN quizzes q ON q.id = qa.quiz_id
JOIN topics  t ON t.id = q.topic_id
WHERE qa.student_id = :student_id
  AND qa.total_questions > 0
GROUP BY DATE(qa.attempted_at), t.name
ORDER BY attempt_date ASC;
*/

-- Q5: Recommended study materials for weak topics (unchanged)
/*
SELECT sm.id, sm.title, sm.description, sm.url, sm.material_type, t.name AS topic_name
FROM study_materials sm
JOIN topics t ON t.id = sm.topic_id
WHERE sm.topic_id = ANY(:weak_topic_ids)
ORDER BY sm.topic_id, sm.material_type;
*/

-- Q6: All documents accessible by a user (owned or collaborator)
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

-- Q7 (NEW): Get a student's answer review for a past attempt
--     Uses the new answers_submitted column to show right/wrong per question
/*
SELECT
    q.id            AS question_id,
    q.question_text,
    q.options,
    q.correct_index,
    q.difficulty,
    (ans->>'chosen_index')::int AS chosen_index,
    (ans->>'chosen_index')::int = q.correct_index AS is_correct
FROM quiz_attempts qa,
     jsonb_array_elements(qa.answers_submitted) AS ans
JOIN questions q ON q.id = (ans->>'question_id')::int
WHERE qa.id = :attempt_id
  AND qa.student_id = :student_id
ORDER BY q.id;
*/

-- Q8 (NEW): Recommend difficulty-appropriate quizzes for weak topics
--     Picks quizzes that contain 'easy' or 'medium' questions on weak topics
/*
SELECT DISTINCT
    qz.id    AS quiz_id,
    qz.title,
    t.name   AS topic_name,
    COUNT(CASE WHEN q.difficulty = 'easy'   THEN 1 END) AS easy_count,
    COUNT(CASE WHEN q.difficulty = 'medium' THEN 1 END) AS medium_count
FROM quizzes  qz
JOIN questions q ON q.quiz_id  = qz.id
JOIN topics   t ON t.id        = qz.topic_id
WHERE qz.topic_id = ANY(:weak_topic_ids)
  AND q.difficulty IN ('easy', 'medium')
GROUP BY qz.id, qz.title, t.name
ORDER BY t.name, qz.id;
*/

-- ============================================================
-- END OF SCHEMA v2
-- ============================================================
-- FlipLearn - Schema MySQL
-- Classe inversee - Application PHP/MySQL

CREATE DATABASE IF NOT EXISTS fliplearn
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fliplearn;

-- ============================================================
-- UTILISATEURS
-- ============================================================
CREATE TABLE users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nom         VARCHAR(100) NOT NULL,
    prenom      VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        ENUM('etudiant', 'professeur', 'admin') NOT NULL DEFAULT 'etudiant',
    filiere     VARCHAR(100) DEFAULT '',
    promotion   VARCHAR(50)  DEFAULT '',
    points      INT          DEFAULT 0,
    is_active   TINYINT(1)   DEFAULT 1,
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- COURS
-- ============================================================
CREATE TABLE courses (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    titre        VARCHAR(255) NOT NULL,
    description  TEXT         DEFAULT NULL,
    professor_id INT          NOT NULL,
    filiere      VARCHAR(100) NOT NULL,
    promotion    VARCHAR(50)  NOT NULL,
    is_active    TINYINT(1)   DEFAULT 1,
    created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- VIDEOS (liens YouTube uniquement)
-- ============================================================
CREATE TABLE videos (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    titre       VARCHAR(255) NOT NULL,
    description TEXT         DEFAULT NULL,
    youtube_url VARCHAR(500) NOT NULL,
    course_id   INT          NOT NULL,
    created_by  INT          NOT NULL,
    position    INT          DEFAULT 0,
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- QCM
-- ============================================================
CREATE TABLE qcms (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    titre               VARCHAR(255) NOT NULL,
    course_id           INT          NOT NULL,
    points_per_question INT          DEFAULT 10,
    timer_seconds       INT          DEFAULT 30,
    created_at          DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- ============================================================
-- QUESTIONS
-- ============================================================
CREATE TABLE questions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    qcm_id          INT          NOT NULL,
    texte           TEXT         NOT NULL,
    option_a        VARCHAR(500) NOT NULL,
    option_b        VARCHAR(500) NOT NULL,
    option_c        VARCHAR(500) NOT NULL,
    option_d        VARCHAR(500) NOT NULL,
    correct_answer  CHAR(1)      NOT NULL,
    explanation     TEXT         DEFAULT NULL,
    FOREIGN KEY (qcm_id) REFERENCES qcms(id) ON DELETE CASCADE
);

-- ============================================================
-- RESULTATS QCM
-- ============================================================
CREATE TABLE qcm_results (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    qcm_id         INT      NOT NULL,
    user_id         INT      NOT NULL,
    score           INT      NOT NULL,
    correct_count   INT      NOT NULL,
    total_questions INT      NOT NULL,
    points_earned   INT      NOT NULL,
    completed_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (qcm_id) REFERENCES qcms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- REPONSES ETUDIANTS
-- ============================================================
CREATE TABLE student_answers (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    result_id    INT     NOT NULL,
    question_id  INT     NOT NULL,
    answer_given CHAR(1) DEFAULT NULL,
    is_correct   TINYINT(1) NOT NULL,
    FOREIGN KEY (result_id) REFERENCES qcm_results(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- ============================================================
-- DONNEES DE TEST
-- ============================================================
-- Mot de passe: admin1234
INSERT INTO users (nom, prenom, email, password, role) VALUES
('Admin', 'FlipLearn', 'admin@fliplearn.dz',
 '$2y$10$8K1p/a0dL1LXMIgZ5fHNh.WQ8dY0LqTauKGYj5e2CMvJg9JtO1FTe', 'admin');

-- Mot de passe: prof1234
INSERT INTO users (nom, prenom, email, password, role, filiere) VALUES
('Benali', 'Karim', 'karim.prof@fliplearn.dz',
 '$2y$10$Yjk5M1Y3Z2FkYjg5ZmRlZOKXvUl8WQjJp5a4C3vkQyD8EzHf5vOXi', 'professeur', 'Informatique');

-- Mot de passe: etudiant123
INSERT INTO users (nom, prenom, email, password, role, filiere, promotion) VALUES
('Meziane', 'Amine', 'amine@fliplearn.dz',
 '$2y$10$R3M1Y3Z2FkYjg5ZmRlZeT4KXvUl8WQjJp5a4C3vkQyD8EzHf5vOXi', 'etudiant', 'Informatique', '2024-2025');

<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

database()->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS reviews (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    message VARCHAR(800) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX reviews_created_at_idx (created_at),
    INDEX reviews_rating_idx (rating)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
SQL);

fwrite(STDOUT, "Reviews table is ready.\n");

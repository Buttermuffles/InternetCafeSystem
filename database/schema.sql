-- ============================================================
-- Internet Café Monitoring System - Database Schema
-- ============================================================
-- Run this SQL in your MySQL server to create the database
-- and required tables.
-- ============================================================

CREATE DATABASE IF NOT EXISTS internet_cafe_monitor
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE internet_cafe_monitor;

-- ============================================================
-- Table: pcs
-- Stores information about each connected PC
-- ============================================================
CREATE TABLE IF NOT EXISTS `pcs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `pc_name` VARCHAR(100) NOT NULL UNIQUE,
    `ip_address` VARCHAR(45) NOT NULL,
    `cpu_usage` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'CPU usage percentage',
    `ram_usage` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'RAM usage percentage',
    `ram_total` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Total RAM in GB',
    `ram_used` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Used RAM in GB',
    `os_info` VARCHAR(255) DEFAULT NULL COMMENT 'Operating system info',
    `screenshot` LONGTEXT DEFAULT NULL COMMENT 'Base64 encoded screenshot',
    `status` ENUM('online', 'offline') DEFAULT 'offline',
    `last_seen` DATETIME DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_pc_name` (`pc_name`),
    INDEX `idx_status` (`status`),
    INDEX `idx_last_seen` (`last_seen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: commands
-- Stores pending and executed commands for PCs
-- ============================================================
CREATE TABLE IF NOT EXISTS `commands` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `pc_name` VARCHAR(100) NOT NULL,
    `command_type` VARCHAR(50) NOT NULL COMMENT 'lock, shutdown, restart, message, execute',
    `command_data` TEXT DEFAULT NULL COMMENT 'Additional data (e.g., message text, command string)',
    `status` ENUM('pending', 'executed', 'failed') DEFAULT 'pending',
    `result` TEXT DEFAULT NULL COMMENT 'Command execution result',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `executed_at` DATETIME DEFAULT NULL,
    INDEX `idx_pc_command` (`pc_name`, `status`),
    INDEX `idx_status` (`status`),
    FOREIGN KEY (`pc_name`) REFERENCES `pcs`(`pc_name`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: api_keys
-- Stores API keys for authentication
-- ============================================================
CREATE TABLE IF NOT EXISTS `api_keys` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `key_name` VARCHAR(100) NOT NULL,
    `api_key` VARCHAR(64) NOT NULL UNIQUE,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_api_key` (`api_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Insert default API key for development
-- ============================================================
INSERT INTO `api_keys` (`key_name`, `api_key`) VALUES
('default_client', 'icafe-monitor-api-key-2024-secure-token-abc123xyz');

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;

use cache::GitplayState;
use tauri::{self, State};
use walker::CommitFrame;

mod cache;
mod walker;

#[tauri::command]
async fn open_repository(path: &str, repo: State<'_, GitplayState>) -> Result<String, String> {
    repo.open(PathBuf::from(path))
}

#[tauri::command]
async fn prepare_cache(repo: State<'_, GitplayState>) -> Result<usize, String> {
    repo.cache_commits()
}

#[tauri::command]
async fn get_commits(
    repo: State<'_, GitplayState>,
    after_commit_id: Option<&str>,
) -> Result<Vec<(String, String)>, String> {
    repo.get_commits(after_commit_id)
}

#[tauri::command]
async fn get_commit_details(
    commit_id: &str,
    repo: State<'_, GitplayState>,
) -> Result<CommitFrame, String> {
    repo.get_commit_details(commit_id)
}

fn main() {
    tauri::Builder::default()
        .manage(GitplayState::new())
        .invoke_handler(tauri::generate_handler![
            open_repository,
            prepare_cache,
            get_commits,
            get_commit_details
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

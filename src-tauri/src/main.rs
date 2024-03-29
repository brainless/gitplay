// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{collections::HashMap, path::PathBuf};

use cache::GitplayState;
use tauri::{self, State};
use walker::CommitFrame;

mod cache;
mod walker;

#[tauri::command]
async fn open_repository(path: &str, repo: State<'_, GitplayState>) -> Result<String, String> {
    println!("open_repository");
    repo.open(PathBuf::from(path))
}

#[tauri::command]
async fn prepare_cache(repo: State<'_, GitplayState>) -> Result<(usize, Vec<String>), String> {
    let output = repo.prepare_cache();
    println!(
        "prepare_cache [count - {:?}] completed",
        output.as_ref().unwrap().0
    );
    output
}

#[tauri::command]
async fn get_commits(
    start_index: Option<usize>,
    count: Option<usize>,
    repo: State<'_, GitplayState>,
) -> Result<HashMap<String, String>, String> {
    let output = repo.get_commits(start_index, count);
    println!("get_commits {:?}, from {:?}, completed", start_index, count);
    output
}

#[tauri::command]
async fn get_commit_details(
    commit_id: &str,
    requested_folders: Vec<&str>,
    repo: State<'_, GitplayState>,
) -> Result<CommitFrame, String> {
    let output = repo.get_commit_details(commit_id, requested_folders.clone());
    println!(
        "get_commit_details, {:?}, {:?} completed",
        commit_id, requested_folders
    );
    output
}

#[tauri::command]
async fn read_file_contents(
    object_id: &str,
    repo: State<'_, GitplayState>,
) -> Result<String, String> {
    let output = repo.read_file_contents(object_id);
    println!("read_file_contents, {:?} completed", object_id);
    output
}

#[tauri::command]
async fn get_sizes_for_paths(
    requested_folders: Vec<&str>,
    start_index: Option<usize>,
    count: Option<usize>,
    repo: State<'_, GitplayState>,
) -> Result<HashMap<String, HashMap<String, bool>>, String> {
    let output = repo.get_sizes_for_paths(requested_folders.clone(), start_index, count);
    println!(
        "get_sizes_for_paths, {:?}, from {:?}, {:?} completed",
        requested_folders, start_index, count
    );
    output
}

#[tauri::command]
async fn get_files_ordered_by_most_modifications(
    start_index: Option<usize>,
    repo: State<'_, GitplayState>,
) -> Result<Vec<(String, usize)>, String> {
    let output = repo.get_files_ordered_by_most_modifications(start_index);
    println!(
        "get_files_ordered_by_most_modifications, from {:?}, completed",
        start_index
    );
    output
}

fn main() {
    tauri::Builder::default()
        .manage(GitplayState::new())
        .invoke_handler(tauri::generate_handler![
            open_repository,
            prepare_cache,
            get_commits,
            get_commit_details,
            read_file_contents,
            get_sizes_for_paths,
            get_files_ordered_by_most_modifications
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

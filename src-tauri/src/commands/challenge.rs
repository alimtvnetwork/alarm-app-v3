// Challenge commands — Phase 8 implementation
// Generate and verify dismissal challenges (Math, Typing, Memory)

use rand::Rng;
use serde::{Deserialize, Serialize};

use crate::errors::AlarmAppError;
use crate::storage::models::{ChallengeDifficulty, ChallengeType};

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct ChallengeQuestion {
    pub challenge_type: ChallengeType,
    pub difficulty: ChallengeDifficulty,
    pub prompt: String,
    pub answer: String,
    pub typing_text: Option<String>,
    pub memory_sequence: Option<Vec<u8>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct GenerateChallengePayload {
    pub challenge_type: ChallengeType,
    pub difficulty: ChallengeDifficulty,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct VerifyChallengePayload {
    pub expected_answer: String,
    pub user_answer: String,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct ChallengeResult {
    pub is_correct: bool,
}

/// Generate a challenge question based on type and difficulty.
#[tauri::command]
pub async fn generate_challenge(
    payload: GenerateChallengePayload,
) -> Result<ChallengeQuestion, AlarmAppError> {
    match payload.challenge_type {
        ChallengeType::Math => generate_math(&payload.difficulty),
        ChallengeType::Typing => generate_typing(&payload.difficulty),
        ChallengeType::Memory => generate_memory(&payload.difficulty),
        _ => Err(AlarmAppError::Validation(
            "Challenge type not supported on desktop".into(),
        )),
    }
}

/// Verify a challenge answer.
#[tauri::command]
pub async fn verify_challenge(
    payload: VerifyChallengePayload,
) -> Result<ChallengeResult, AlarmAppError> {
    let is_correct = payload
        .user_answer
        .trim()
        .eq_ignore_ascii_case(payload.expected_answer.trim());
    Ok(ChallengeResult { is_correct })
}

// ── Math Challenge ──

fn generate_math(difficulty: &ChallengeDifficulty) -> Result<ChallengeQuestion, AlarmAppError> {
    let mut rng = rand::thread_rng();

    let (prompt, answer) = match difficulty {
        ChallengeDifficulty::Easy => {
            let a = rng.gen_range(1..=20);
            let b = rng.gen_range(1..=20);
            (format!("{a} + {b} = ?"), (a + b).to_string())
        }
        ChallengeDifficulty::Medium => {
            let a = rng.gen_range(10..=50);
            let b = rng.gen_range(5..=30);
            if rng.gen_bool(0.5) {
                (format!("{a} × {b} = ?"), (a * b).to_string())
            } else {
                (format!("{a} + {b} = ?"), (a + b).to_string())
            }
        }
        ChallengeDifficulty::Hard => {
            let a = rng.gen_range(12..=99);
            let b = rng.gen_range(12..=99);
            (format!("{a} × {b} = ?"), (a * b).to_string())
        }
    };

    Ok(ChallengeQuestion {
        challenge_type: ChallengeType::Math,
        difficulty: difficulty.clone(),
        prompt,
        answer,
        typing_text: None,
        memory_sequence: None,
    })
}

// ── Typing Challenge ──

const TYPING_PHRASES_EASY: &[&str] = &[
    "Good morning sunshine",
    "Rise and shine today",
    "Time to wake up now",
];

const TYPING_PHRASES_MEDIUM: &[&str] = &[
    "The early bird catches the worm every day",
    "A journey of a thousand miles begins with one step",
    "Every morning brings new potential and possibilities",
];

const TYPING_PHRASES_HARD: &[&str] = &[
    "The quick brown fox jumps over the lazy dog near the riverbank",
    "Success is not final, failure is not fatal, it is the courage to continue that counts",
    "In the middle of difficulty lies opportunity waiting to be discovered and embraced",
];

fn generate_typing(difficulty: &ChallengeDifficulty) -> Result<ChallengeQuestion, AlarmAppError> {
    let mut rng = rand::thread_rng();
    let phrases = match difficulty {
        ChallengeDifficulty::Easy => TYPING_PHRASES_EASY,
        ChallengeDifficulty::Medium => TYPING_PHRASES_MEDIUM,
        ChallengeDifficulty::Hard => TYPING_PHRASES_HARD,
    };
    let idx = rng.gen_range(0..phrases.len());
    let text = phrases[idx].to_string();

    Ok(ChallengeQuestion {
        challenge_type: ChallengeType::Typing,
        difficulty: difficulty.clone(),
        prompt: "Type the following text exactly:".into(),
        answer: text.clone(),
        typing_text: Some(text),
        memory_sequence: None,
    })
}

// ── Memory Challenge ──

fn generate_memory(difficulty: &ChallengeDifficulty) -> Result<ChallengeQuestion, AlarmAppError> {
    let mut rng = rand::thread_rng();
    let len = match difficulty {
        ChallengeDifficulty::Easy => 4,
        ChallengeDifficulty::Medium => 6,
        ChallengeDifficulty::Hard => 8,
    };

    let sequence: Vec<u8> = (0..len).map(|_| rng.gen_range(1..=9)).collect();
    let answer = sequence.iter().map(|n| n.to_string()).collect::<String>();

    Ok(ChallengeQuestion {
        challenge_type: ChallengeType::Memory,
        difficulty: difficulty.clone(),
        prompt: "Remember and repeat the sequence:".into(),
        answer,
        typing_text: None,
        memory_sequence: Some(sequence),
    })
}

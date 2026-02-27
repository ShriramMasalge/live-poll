#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracterror, symbol_short,
    Address, Env, String, Symbol,
};

const QUESTION:   Symbol = symbol_short!("QUESTION");
const OPT_A:      Symbol = symbol_short!("OPT_A");
const OPT_B:      Symbol = symbol_short!("OPT_B");
const VOTES_A:    Symbol = symbol_short!("VOTES_A");
const VOTES_B:    Symbol = symbol_short!("VOTES_B");
const ADMIN:      Symbol = symbol_short!("ADMIN");
const POLL_OPEN:  Symbol = symbol_short!("OPEN");

const EVT_VOTED:  Symbol = symbol_short!("voted");
const EVT_INIT:   Symbol = symbol_short!("poll_init");
const EVT_CLOSED: Symbol = symbol_short!("closed");

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum PollError {
    AlreadyVoted   = 1,
    PollClosed     = 2,
    InvalidOption  = 3,
    Unauthorized   = 4,
    NotInitialized = 5,
}

#[contract]
pub struct PollContract;

#[contractimpl]
impl PollContract {

    pub fn initialize(
        env: Env,
        admin: Address,
        question: String,
        option_a: String,
        option_b: String,
    ) {
        admin.require_auth();
        env.storage().instance().set(&ADMIN,     &admin);
        env.storage().instance().set(&QUESTION,  &question.clone());
        env.storage().instance().set(&OPT_A,     &option_a.clone());
        env.storage().instance().set(&OPT_B,     &option_b.clone());
        env.storage().instance().set(&VOTES_A,   &0_u32);
        env.storage().instance().set(&VOTES_B,   &0_u32);
        env.storage().instance().set(&POLL_OPEN, &true);
        env.events().publish((EVT_INIT,), (question, option_a, option_b));
    }

    pub fn vote(env: Env, voter: Address, option: u32) -> Result<(), PollError> {
        voter.require_auth();

        let open: bool = env.storage().instance().get(&POLL_OPEN).unwrap_or(false);
        if !open {
            return Err(PollError::PollClosed);
        }

        let voted_key = (symbol_short!("voted"), voter.clone());
        if env.storage().persistent().has(&voted_key) {
            return Err(PollError::AlreadyVoted);
        }

        if option > 1 {
            return Err(PollError::InvalidOption);
        }

        env.storage().persistent().set(&voted_key, &true);

        if option == 0 {
            let prev: u32 = env.storage().instance().get(&VOTES_A).unwrap_or(0);
            env.storage().instance().set(&VOTES_A, &(prev + 1));
        } else {
            let prev: u32 = env.storage().instance().get(&VOTES_B).unwrap_or(0);
            env.storage().instance().set(&VOTES_B, &(prev + 1));
        }

        env.events().publish((EVT_VOTED,), (voter, option));
        Ok(())
    }

    pub fn results(env: Env) -> (u32, u32) {
        let a: u32 = env.storage().instance().get(&VOTES_A).unwrap_or(0);
        let b: u32 = env.storage().instance().get(&VOTES_B).unwrap_or(0);
        (a, b)
    }

    pub fn has_voted(env: Env, voter: Address) -> bool {
        let voted_key = (symbol_short!("voted"), voter);
        env.storage().persistent().has(&voted_key)
    }

    pub fn get_poll(env: Env) -> (String, String, String, bool) {
        let question: String = env.storage().instance().get(&QUESTION).unwrap();
        let opt_a: String    = env.storage().instance().get(&OPT_A).unwrap();
        let opt_b: String    = env.storage().instance().get(&OPT_B).unwrap();
        let open: bool       = env.storage().instance().get(&POLL_OPEN).unwrap_or(false);
        (question, opt_a, opt_b, open)
    }

    pub fn close_poll(env: Env, admin: Address) -> Result<(), PollError> {
        admin.require_auth();

        let stored_admin: Address = env.storage().instance()
            .get(&ADMIN)
            .ok_or(PollError::NotInitialized)?;

        if admin != stored_admin {
            return Err(PollError::Unauthorized);
        }

        env.storage().instance().set(&POLL_OPEN, &false);
        env.events().publish((EVT_CLOSED,), ());
        Ok(())
    }
}
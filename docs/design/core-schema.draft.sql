-- S00-07 partial core constraint prototype; not a production migration.
PRAGMA foreign_keys=ON;
CREATE TABLE users(id TEXT PRIMARY KEY, player_code TEXT NOT NULL UNIQUE);
CREATE TABLE levels(id TEXT PRIMARY KEY, size INTEGER NOT NULL CHECK(size BETWEEN 4 AND 10), regions TEXT NOT NULL CHECK(json_valid(regions)), solution TEXT NOT NULL CHECK(json_valid(solution)), rule_version INTEGER NOT NULL CHECK(rule_version>0), locked INTEGER NOT NULL DEFAULT 0 CHECK(locked IN(0,1)));
CREATE TRIGGER protect_level BEFORE UPDATE ON levels WHEN OLD.locked=1 AND (NEW.size IS NOT OLD.size OR NEW.regions IS NOT OLD.regions OR NEW.solution IS NOT OLD.solution OR NEW.rule_version IS NOT OLD.rule_version OR NEW.locked<>1) BEGIN SELECT RAISE(ABORT,'published level immutable'); END;
CREATE TRIGGER protect_level_delete BEFORE DELETE ON levels WHEN OLD.locked=1 BEGIN SELECT RAISE(ABORT,'published level immutable'); END;
CREATE TABLE user_puzzle_progress(user_id TEXT NOT NULL REFERENCES users(id), level_id TEXT NOT NULL REFERENCES levels(id), best_stars INTEGER NOT NULL CHECK(best_stars BETWEEN 0 AND 3), PRIMARY KEY(user_id,level_id));
CREATE TABLE reward_claims(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),business_key TEXT NOT NULL,snapshot TEXT NOT NULL CHECK(json_valid(snapshot)),UNIQUE(user_id,business_key));
CREATE TABLE user_assets(user_id TEXT PRIMARY KEY REFERENCES users(id),coins INTEGER NOT NULL DEFAULT 0 CHECK(coins>=0),energy INTEGER NOT NULL DEFAULT 0 CHECK(energy>=0),hints INTEGER NOT NULL DEFAULT 0 CHECK(hints>=0));
CREATE TABLE pending_energy(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),source_key TEXT NOT NULL,total INTEGER NOT NULL CHECK(total>0),claimed INTEGER NOT NULL DEFAULT 0 CHECK(claimed>=0 AND claimed<=total),UNIQUE(user_id,source_key));
CREATE TABLE asset_transactions(id TEXT PRIMARY KEY,claim_id TEXT NOT NULL REFERENCES reward_claims(id),asset_type TEXT NOT NULL CHECK(asset_type IN('coins','energy','hints')),line_no INTEGER NOT NULL,delta INTEGER NOT NULL,before_value INTEGER NOT NULL CHECK(before_value>=0),after_value INTEGER NOT NULL CHECK(after_value>=0 AND after_value=before_value+delta),UNIQUE(claim_id,asset_type,line_no));
CREATE TABLE game_saves(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),version INTEGER NOT NULL CHECK(version>0),payload TEXT NOT NULL CHECK(json_valid(payload)));
CREATE TABLE save_conflicts(id TEXT PRIMARY KEY,save_id TEXT NOT NULL REFERENCES game_saves(id),base_version INTEGER NOT NULL,payload TEXT NOT NULL CHECK(json_valid(payload)),created_at INTEGER NOT NULL);
CREATE TABLE ad_sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),created_at INTEGER NOT NULL,completion_deadline INTEGER NOT NULL,completed_at INTEGER,claim_deadline INTEGER,CHECK(completion_deadline=created_at+1800000),CHECK((completed_at IS NULL AND claim_deadline IS NULL) OR (completed_at IS NOT NULL AND claim_deadline IS NOT NULL AND completed_at>=created_at AND completed_at<=completion_deadline AND claim_deadline=completed_at+86400000)));
CREATE INDEX claims_by_user ON reward_claims(user_id);
CREATE INDEX conflict_by_save ON save_conflicts(save_id,created_at);

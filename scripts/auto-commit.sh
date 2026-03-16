#!/bin/bash

# Auto-commit and push script for Agent Vault
# Generates structured commit messages based on what actually changed.
#
# Message format: <type>(<scope>): <description>
#   type  = feat | fix | refactor | style | docs | chore | test
#   scope = contracts | web | mcp-server | packages | proxy | payment |
#           sessions | marketplace | pay | config | project
#
# Examples:
#   feat(contracts): add AgentDelegator session key enforcement contract
#   feat(mcp-server): add workflow tool for agent execution
#   feat(web): add session key management UI
#   chore(config): update dependencies and build scripts

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$REPO_ROOT/logs/auto-commit.log"
INTERVAL=60  # seconds

mkdir -p "$REPO_ROOT/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ---------------------------------------------------------------------------
# Determine the conventional-commit type (feat, fix, refactor, …)
# ---------------------------------------------------------------------------
detect_type() {
    local added="$1" modified="$2" deleted="$3"

    # If only deletions → chore
    if [[ -z "$added" && -z "$modified" && -n "$deleted" ]]; then
        echo "chore"; return
    fi

    # New files → feat
    if [[ -n "$added" ]]; then
        echo "feat"; return
    fi

    # Config / dependency changes → chore
    if echo "$modified" | grep -qE "(package\.json|tsconfig|\.env|\.gitignore|pnpm-workspace)"; then
        echo "chore"; return
    fi

    # Test files → test
    if echo "$modified" | grep -qE "(test|spec|_test)\.(ts|tsx|sol)$"; then
        echo "test"; return
    fi

    # Docs → docs
    if echo "$modified" | grep -qE "\.(md|txt)$" && ! echo "$modified" | grep -qvE "\.(md|txt)$"; then
        echo "docs"; return
    fi

    echo "feat"
}

# ---------------------------------------------------------------------------
# Determine the scope from file paths (Agent Vault-specific)
# ---------------------------------------------------------------------------
detect_scope() {
    local all_files="$1"

    local has_contracts=false has_web=false has_mcp=false has_packages=false
    local has_proxy=false has_payment=false has_sessions=false has_marketplace=false
    local has_pay=false has_auth=false has_config=false has_scripts=false
    local has_api=false has_lib=false

    while IFS= read -r f; do
        [[ -z "$f" ]] && continue
        case "$f" in
            hardhat/contracts/*)              has_contracts=true ;;
            hardhat/*)                        has_contracts=true ;;
            apps/mcp-server/*)                has_mcp=true ;;
            apps/web/app/api/proxy/*)         has_proxy=true ;;
            apps/web/app/api/pay/*)           has_payment=true ;;
            apps/web/app/api/sessions/*)      has_sessions=true ;;
            apps/web/app/api/*)               has_api=true ;;
            apps/web/features/pay/*)          has_pay=true ;;
            apps/web/features/sessionKeys/*)  has_sessions=true ;;
            apps/web/features/marketplace/*)  has_marketplace=true ;;
            apps/web/features/authorization/*) has_auth=true ;;
            apps/web/features/*)              has_web=true ;;
            apps/web/lib/*)                   has_lib=true ;;
            apps/web/config/*)                has_config=true ;;
            apps/web/*)                       has_web=true ;;
            packages/contracts/*)             has_packages=true ;;
            packages/*)                       has_packages=true ;;
            scripts/*)                        has_scripts=true ;;
            *.json|*.config.*|.env*|.gitignore|pnpm-workspace.yaml)
                                              has_config=true ;;
        esac
    done <<< "$all_files"

    local scopes=()
    $has_contracts   && scopes+=("contracts")
    $has_proxy       && scopes+=("proxy")
    $has_payment     && scopes+=("payment")
    $has_sessions    && scopes+=("sessions")
    $has_marketplace && scopes+=("marketplace")
    $has_pay         && scopes+=("pay")
    $has_auth        && scopes+=("auth")
    $has_mcp         && scopes+=("mcp-server")
    $has_api         && scopes+=("api")
    $has_lib         && scopes+=("lib")
    $has_web         && scopes+=("web")
    $has_packages    && scopes+=("packages")
    $has_scripts     && scopes+=("scripts")
    $has_config      && scopes+=("config")

    if [[ ${#scopes[@]} -eq 0 ]]; then
        echo "project"
    elif [[ ${#scopes[@]} -eq 1 ]]; then
        echo "${scopes[0]}"
    else
        local IFS=","
        echo "${scopes[*]}"
    fi
}

# ---------------------------------------------------------------------------
# Build a human-readable description of the changes
# ---------------------------------------------------------------------------
describe_changes() {
    local added="$1" modified="$2" deleted="$3"
    local all_files="$4"
    local desc=""

    # --- AgentDelegator contract ---
    if echo "$all_files" | grep -q "AgentDelegator"; then
        if echo "$added" | grep -q "AgentDelegator"; then
            desc="${desc:+$desc, }add AgentDelegator session key enforcement contract"
        else
            desc="${desc:+$desc, }update AgentDelegator contract"
        fi
    fi

    # --- Other Solidity contracts ---
    if echo "$all_files" | grep -q "hardhat/contracts/"; then
        if ! echo "$all_files" | grep -q "AgentDelegator"; then
            local contract_files=$(echo "$all_files" | grep "hardhat/contracts/" | xargs -I{} basename {} .sol 2>/dev/null | sort -u | tr '\n' ',' | sed 's/,$//')
            if echo "$added" | grep -q "hardhat/contracts/"; then
                desc="${desc:+$desc, }add ${contract_files} contract(s)"
            else
                desc="${desc:+$desc, }update ${contract_files} contract(s)"
            fi
        fi
    fi

    # --- Hardhat scripts/config ---
    if echo "$all_files" | grep -q "hardhat/" && ! echo "$all_files" | grep -q "hardhat/contracts/"; then
        desc="${desc:+$desc, }update Hardhat deployment config"
    fi

    # --- MCP Server ---
    if echo "$all_files" | grep -q "apps/mcp-server/"; then
        local mcp_files=$(echo "$all_files" | grep "apps/mcp-server/" | xargs -I{} basename {} .ts 2>/dev/null | sort -u | tr '\n' ',' | sed 's/,$//')
        if echo "$added" | grep -q "apps/mcp-server/"; then
            desc="${desc:+$desc, }add MCP server ${mcp_files}"
        else
            desc="${desc:+$desc, }update MCP server ${mcp_files}"
        fi
    fi

    # --- Proxy API ---
    if echo "$all_files" | grep -q "app/api/proxy/"; then
        if echo "$added" | grep -q "app/api/proxy/"; then
            desc="${desc:+$desc, }add proxy route for API monetization"
        else
            desc="${desc:+$desc, }update proxy route"
        fi
    fi

    # --- Payment features ---
    if echo "$all_files" | grep -q "features/pay/"; then
        if echo "$added" | grep -q "features/pay/"; then
            desc="${desc:+$desc, }add payment UI components"
        else
            desc="${desc:+$desc, }update payment flow"
        fi
    fi

    # --- Session keys ---
    if echo "$all_files" | grep -q "sessionKeys\|sessions"; then
        if echo "$added" | grep -q "sessionKeys\|sessions"; then
            desc="${desc:+$desc, }add session key management"
        else
            desc="${desc:+$desc, }update session key logic"
        fi
    fi

    # --- Marketplace ---
    if echo "$all_files" | grep -q "features/marketplace/"; then
        if echo "$added" | grep -q "features/marketplace/"; then
            desc="${desc:+$desc, }add API marketplace"
        else
            desc="${desc:+$desc, }update marketplace"
        fi
    fi

    # --- Authorization ---
    if echo "$all_files" | grep -q "features/authorization/"; then
        if echo "$added" | grep -q "features/authorization/"; then
            desc="${desc:+$desc, }add authorization flow"
        else
            desc="${desc:+$desc, }update authorization"
        fi
    fi

    # --- Web lib ---
    if echo "$all_files" | grep -q "apps/web/lib/"; then
        if echo "$added" | grep -q "apps/web/lib/"; then
            desc="${desc:+$desc, }add web utility libraries"
        else
            desc="${desc:+$desc, }update web libraries"
        fi
    fi

    # --- Web app pages ---
    if echo "$all_files" | grep -q "apps/web/app/" && ! echo "$all_files" | grep -q "apps/web/app/api/"; then
        if echo "$added" | grep -q "apps/web/app/"; then
            desc="${desc:+$desc, }add Next.js pages"
        else
            desc="${desc:+$desc, }update app pages"
        fi
    fi

    # --- Packages ---
    if echo "$all_files" | grep -q "^packages/"; then
        if echo "$added" | grep -q "^packages/"; then
            desc="${desc:+$desc, }add shared packages"
        else
            desc="${desc:+$desc, }update shared packages"
        fi
    fi

    # --- Dependencies ---
    if echo "$all_files" | grep -q "package\.json"; then
        desc="${desc:+$desc, }update dependencies"
    fi

    # --- pnpm workspace ---
    if echo "$all_files" | grep -q "pnpm-workspace"; then
        desc="${desc:+$desc, }update workspace configuration"
    fi

    # --- Scripts ---
    if echo "$all_files" | grep -q "^scripts/"; then
        desc="${desc:+$desc, }update build/deploy scripts"
    fi

    # --- Deletions ---
    if [[ -n "$deleted" ]]; then
        local del_count=$(echo "$deleted" | wc -l | xargs)
        desc="${desc:+$desc, }remove $del_count file(s)"
    fi

    # Fallback
    if [[ -z "$desc" ]]; then
        local file_count=$(echo "$all_files" | wc -l | xargs)
        local first_file=$(echo "$all_files" | head -1 | xargs basename 2>/dev/null || echo "files")
        if [[ $file_count -eq 1 ]]; then
            desc="update $first_file"
        else
            desc="update $file_count files"
        fi
    fi

    echo "$desc"
}

# ---------------------------------------------------------------------------
# Main: generate full commit message
# ---------------------------------------------------------------------------
generate_commit_message() {
    local added=$(git diff --cached --name-only --diff-filter=A)
    local modified=$(git diff --cached --name-only --diff-filter=M)
    local deleted=$(git diff --cached --name-only --diff-filter=D)
    local all_files=$(git diff --cached --name-only)

    local type=$(detect_type "$added" "$modified" "$deleted")
    local scope=$(detect_scope "$all_files")
    local desc=$(describe_changes "$added" "$modified" "$deleted" "$all_files")

    echo "${type}(${scope}): ${desc}"
}

# ---------------------------------------------------------------------------
# Commit + push
# ---------------------------------------------------------------------------
do_commit() {
    cd "$REPO_ROOT" || { log "Failed to navigate to repo root"; return 1; }

    if [[ -z $(git status -s) ]]; then
        return 0
    fi

    log "Changes detected:"
    git status -s >> "$LOG_FILE"

    git add .

    local commit_msg=$(generate_commit_message)
    log "Commit: $commit_msg"
    git commit -m "$commit_msg"

    log "Pushing to origin/main..."
    if git push origin main 2>&1 | tee -a "$LOG_FILE"; then
        log "Pushed successfully."
    else
        log "Push failed."
        return 1
    fi
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
case "${1:-}" in
    --once)
        log "Running single commit check..."
        do_commit
        ;;
    --watch|"")
        log "Auto-commit started (interval: ${INTERVAL}s)"
        while true; do
            do_commit
            sleep $INTERVAL
        done
        ;;
    --help)
        echo "Usage: $0 [--once|--watch|--help]"
        echo "  --once   Run once and exit"
        echo "  --watch  Run continuously (default)"
        echo "  --help   Show this help"
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use --help for usage"
        exit 1
        ;;
esac

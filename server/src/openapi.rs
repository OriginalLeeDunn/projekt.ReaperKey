use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    info(
        title = "GhostKey API",
        version = "1.0.0",
        description = "Non-custodial wallet abstraction layer — ERC-4337 smart account management"
    ),
    paths(
        crate::routes::health::check,
        crate::routes::auth::login,
        crate::routes::auth::refresh,
        crate::routes::account::create,
        crate::routes::account::fetch,
        crate::routes::session_key::issue,
        crate::routes::intent::execute,
        crate::routes::intent::status,
        crate::routes::recovery::init,
    ),
    components(
        schemas(
            crate::models::user::LoginRequest,
            crate::models::user::AuthMethod,
            crate::models::user::RefreshRequest,
            crate::models::user::AuthResponse,
            crate::models::account::CreateAccountRequest,
            crate::models::account::AccountResponse,
            crate::models::session::IssueSessionKeyRequest,
            crate::models::session::SessionKeyResponse,
            crate::models::intent::ExecuteIntentRequest,
            crate::models::intent::IntentResponse,
            crate::models::intent::IntentStatus,
            RecoveryInitRequest,
        )
    ),
    tags(
        (name = "auth", description = "Authentication — JWT-based login, refresh, logout"),
        (name = "account", description = "Smart account management"),
        (name = "session", description = "Session key issuance"),
        (name = "intent", description = "Intent execution and status tracking"),
        (name = "recovery", description = "Social recovery"),
    )
)]
pub struct ApiDoc;

use crate::routes::recovery::RecoveryInitRequest;

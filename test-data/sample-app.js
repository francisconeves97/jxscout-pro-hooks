// Sample JavaScript file for testing jxscout hooks
// Contains various security patterns that should be detected

// SECURITY: This endpoint needs authentication
// TODO: Add rate limiting to prevent brute force
const API_URL = "https://api-staging.example.com/v1/users";
const S3_BUCKET = "https://user-uploads.s3.amazonaws.com";
const INTERNAL_API = "https://admin.internal.example.com";

// FIXME: Remove this hardcoded APIKEY before production
const APIKEY = "sk_test_1234567890abcdef";

// JWT token for testing (hardcoded - BAD PRACTICE)
const TEST_JWT = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlzQWRtaW4iOnRydWUsImRlYnVnIjp0cnVlLCJpYXQiOjE1MTYyMzkwMjJ9.";

// DOM XSS vulnerability - innerHTML with user input
function displayUserContent() {
  const userInput = location.hash.substring(1);
  // BUG: XSS vulnerability here
  document.getElementById("content").innerHTML = userInput;
}

// CSS Injection vulnerability
function applyUserStyles(color) {
  const element = document.querySelector(".user-content");
  // HACK: This is a temporary workaround
  element.style.cssText = "color: " + color + "; background: " + location.search;
}

// Another XSS sink
function runUserCode(code) {
  // WARNING: eval is dangerous
  eval(code);
}

// More domains referenced
const endpoints = {
  dev: "https://dev.example.com/api",
  staging: "https://staging.example.com/api",
  cdn: "https://cdn.example.com",
  analytics: "https://analytics-provider.com/track"
};

// Untrusted source
const userData = localStorage.getItem("user_data");
document.write(userData); // Another XSS vector

// CSS injection via setAttribute
function updateTheme(theme) {
  const style = document.createElement("style");
  style.setAttribute("type", "text/css");
  // DEPRECATED: Use new theme system
  style.textContent = theme;
  document.head.appendChild(style);
}

// More comments that should be detected
// SECURITY: Authentication bypass possible if token is empty
// XXX: This is a critical bug that needs immediate attention

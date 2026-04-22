export function setupApi() {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    if (response.status === 401) {
      localStorage.removeItem("auth_token");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = import.meta.env.BASE_URL + "login";
      }
    }
    return response;
  };
}

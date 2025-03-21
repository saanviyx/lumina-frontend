// Handle theme toggling functionality

export function initializeTheme() {
    // Theme toggle functionality
    document.getElementById("themeToggle").addEventListener("change", function () {
      document.body.classList.toggle("dark-mode");
      
      // Optionally save theme preference to localStorage
      const isDarkMode = document.body.classList.contains("dark-mode");
      localStorage.setItem("darkMode", isDarkMode);
    });
    
    // Apply saved theme preference on load
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    if (savedDarkMode) {
      document.body.classList.add("dark-mode");
      document.getElementById("themeToggle").checked = true;
    }
  }
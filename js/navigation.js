// Handle page navigation and UI update based on authentication status

export function initializeNavigation(appState) {
  // Page navigation event listener
  document.addEventListener("click", function(e) {
    if (e.target.hasAttribute("data-page")) {
      let pageId = e.target.getAttribute("data-page");
      showPage(pageId, appState);
      e.preventDefault();
    }
  });
}

export function showPage(pageId, appState) {
  // Hide all pages
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });
  
  // Show selected page
  const pageElement = document.getElementById(pageId);
  if (pageElement) {
    pageElement.classList.add("active");
  }

  // Special handling for progress page
  if (pageId === "progress") {
    const progressContent = document.querySelector(".progress-content");
    const loginRequiredMessage = document.querySelector(".login-required-message");
    
    // Check if elements exist before trying to modify their style
    if (progressContent && loginRequiredMessage) {
      if (appState.currentUser) {
        // Show progress content and hide login message
        progressContent.style.display = "block";
        loginRequiredMessage.style.display = "none";
      } else {
        // Hide progress content and show login message
        progressContent.style.display = "none";
        loginRequiredMessage.style.display = "block";
      }
    }
  }
}

export function updateNavigation(appState) {
  const authLinks = document.querySelectorAll(".auth-link");
  const authProfile = document.querySelectorAll(".auth-profile");
  const progressLink = document.querySelector('a[data-page="progress"]');
  const userDisplayName = document.getElementById("userDisplayName");
 
  if (appState.currentUser) {
    // User is logged in
    authLinks.forEach(link => {
      if (link) link.style.display = "none";
    });
    
    authProfile.forEach(element => {
      if (element) element.style.display = "inline-block";
    });
    
    // Show Progress link
    if (progressLink && progressLink.parentElement) {
      progressLink.parentElement.style.display = "inline-block";
    }
    
    // Update user profile in nav bar
    if (userDisplayName) userDisplayName.textContent = appState.currentUser.username;
    
    // Show protected elements
    document.querySelectorAll(".auth-required").forEach(element => {
      element.classList.remove("auth-required");
    });
  } else {
    // Guest mode (default)
    authLinks.forEach(link => {
      if (link) link.style.display = "inline-block";
    });
    
    authProfile.forEach(element => {
      if (element) element.style.display = "none";
    });
    
    // Hide Progress link
    if (progressLink && progressLink.parentElement) {
      progressLink.parentElement.style.display = "none";
    }
  }
}
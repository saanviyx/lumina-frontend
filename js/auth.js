// Handle user authentication (login, register, logout)
import { showError, showSuccess, showInfo, initializeNotifications } from './notification.js';

export function initializeAuth(appState) {
  // Initialize notification system
  initializeNotifications();
  
  // Login functionality
  document.getElementById("loginButton").addEventListener("click", async function() {
    const username = document.getElementById("loginUser").value;
    const password = document.getElementById("loginPass").value;

    if (!username || !password) {
      showError("Please enter both username and password.", "Login Failed");
      return;
    }
    
    try {
      const response = await fetch(`${appState.API_URL}/authentication/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Save user data and token
        appState.updateCurrentUser(data.user);
        appState.setAuthToken(data.token);

        import('./routine.js').then(module => {
          module.loadStoredRoutines();
        });
        
        // Update navigation
        const { updateNavigation, showPage } = await import('./navigation.js');
        updateNavigation(appState);
        
        // Check if we need to return to a specific page after login
        const returnToPage = localStorage.getItem("returnToPage");
        
        // If there was a guest routine, save it to the user's account
        if (appState.guestRoutine) {
          try {
            // Get the guest uploaded image if it exists
            const guestUploadedImage = localStorage.getItem("guestUploadedImage");
            
            await fetch(`${appState.API_URL}/analysis/save`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${appState.authToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                routine: appState.guestRoutine,
                skinCondition: extractConditionInfo(appState.guestRoutine).condition,
                confidence: extractConditionInfo(appState.guestRoutine).confidence,
                selectedBudget: appState.guestRoutineType || 'budget',
              })
            });
            
            // Clear guest routine and image
            appState.setGuestRoutine(null);
            appState.setGuestRoutineType(null);
            localStorage.removeItem("guestUploadedImage");
            
            showSuccess("Your guest routine has been saved to your account.", "Routine Saved");
          } catch (error) {
            console.error("Error saving guest routine:", error);
            showError("Unable to save your guest routine. Please try again later.", "Save Error");
          }
        } else {
          showSuccess("You have successfully logged in.", "Welcome Back");
        }
        
        if (returnToPage) {
          // Clear the return page from localStorage
          localStorage.removeItem("returnToPage");
          
          // Navigate to the specified page
          showPage(returnToPage, appState);
          
          // If returning to upload page after login
          if (returnToPage === "upload") {
            const resultDiv = document.getElementById('result');
            if (resultDiv) {
              resultDiv.innerHTML = `
                <div class="analysis-result" style="background-color: var(--light-bg);">
                  <div class="analysis-header" style="padding-top: 0rem; justify-content: center; margin-bottom: 0px;">
                    <h2 style="font-size: 1.5rem">Routine Saved Successfully!</h2>
                    <p style="font-size: 1rem">Login successful! Your routine has been saved.</p>
                  </div>
                  <div class="action-buttons" style="justify-content: center;">
                    <button class="primary-button" id="viewRoutineButton">
                      <i class="fas fa-list"></i> View My Routine
                    </button>
                  </div>
                </div>
              `;
              
              document.getElementById('viewRoutineButton').addEventListener('click', () => {
                document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
                document.getElementById('routine').classList.add('active');
                // Import and call loadStoredRoutines from routine.js
                import('./routine.js').then(module => {
                  module.loadStoredRoutines();
                });
              });
            }
          }
        } else {
          // Navigate to home page if no specific return page
          showPage("home", appState);
        }
      } else {
        const errorData = await response.json();
        showError(errorData.message || "Please check your username and password and try again.", "Login Failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      showError("Unable to connect to the server. Please check your internet connection and try again.", "Connection Error");
    }
  });

  // Register functionality
  document.getElementById("registerButton").addEventListener("click", async function() {
    const Name = document.getElementById("registerName").value;
    const username = document.getElementById("registerUser").value;
    const email = document.getElementById("registerEmail").value;
    const gender = document.querySelector('input[name="gender"]:checked')?.value;
    const password = document.getElementById("registerPass").value;
    const confirmPassword = document.getElementById("registerConfirmPass").value;
    
    // Basic validation
    if (!Name || !email || !username || !password) {
      showError("Please fill in all required fields.", "Registration Failed");
      return;
    }
    
    if (password !== confirmPassword) {
      showError("Passwords do not match. Please check and try again.", "Registration Failed");
      return;
    }
    
    try {
      const response = await fetch(`${appState.API_URL}/authentication/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Name,
          username,
          email,
          gender,
          password
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Save user data and token
        appState.updateCurrentUser(data.user);
        appState.setAuthToken(data.token);
        
        // Update navigation
        const { updateNavigation, showPage } = await import('./navigation.js');
        updateNavigation(appState);

        // Load routines after login
        const { loadStoredRoutines } = await import('./routine.js');
        loadStoredRoutines();

        // Check if we need to return to a specific page after registration
        const returnToPage = localStorage.getItem("returnToPage");
        
        // If there was a guest routine, save it to the user's account
        if (appState.guestRoutine) {
          try {
            await fetch(`${appState.API_URL}/analysis/save`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${appState.authToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                routine: appState.guestRoutine,
                skinCondition: extractConditionInfo(appState.guestRoutine).condition,
                confidence: extractConditionInfo(appState.guestRoutine).confidence,
                selectedBudget: appState.guestRoutineType || 'budget',
              })
            });
            
            // Clear guest routine and image
            appState.setGuestRoutine(null);
            appState.setGuestRoutineType(null);
            localStorage.removeItem("guestUploadedImage");
            
            showSuccess("Your guest routine has been saved to your new account.", "Routine Saved");
          } catch (error) {
            console.error("Error saving guest routine:", error);
            showError("Unable to save your guest routine. Please try again later.", "Save Error");
          }
        } else {
          showSuccess("Your account has been created successfully.", "Welcome!");
        }
        
        if (returnToPage) {
          // Clear the return page from localStorage
          localStorage.removeItem("returnToPage");
          
          // Navigate to the specified page
          showPage(returnToPage, appState);
          
          // If returning to upload page after registration
          if (returnToPage === "upload") {
            const resultDiv = document.getElementById('result');
            if (resultDiv) {
              resultDiv.innerHTML = `
                <div class="analysis-result" style="background-color: var(--light-bg);">
                  <div class="analysis-header" style="padding-top: 0rem; justify-content: center; margin-bottom: 0px;">
                    <h2 style="font-size: 1.5rem">Routine Saved Successfully!</h2>
                    <p style="font-size: 1rem">Registration successful! Your routine has been saved.</p>
                  </div>
                  <div class="action-buttons" style="justify-content: center;">
                    <button class="primary-button" id="viewRoutineButton">
                      <i class="fas fa-list"></i> View My Routine
                    </button>
                  </div>
                </div>
              `;
              
              document.getElementById('viewRoutineButton').addEventListener('click', () => {
                document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
                document.getElementById('routine').classList.add('active');
                // Import and call loadStoredRoutines from routine.js
                import('./routine.js').then(module => {
                  module.loadStoredRoutines();
                });
              });
            }
          }
        } else {
          // Navigate to home page if no specific return page
          showPage("home", appState);
        }
      } else {
        const errorData = await response.json();
        showError(errorData.message || "Unable to create your account. Please try again with different credentials.", "Registration Failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      showError("Unable to connect to the server. Please check your internet connection and try again.", "Connection Error");
    }
  });

  // Logout functionality
  document.getElementById("logoutButton").addEventListener("click", function(e) {
    e.preventDefault();
    
    // Clear all user data
    appState.clearAllData();
    window.location.reload();
  });
}

// Check token validity on page load
export async function checkTokenValidity(appState) {
  if (!appState.authToken) return false;
  
  try {
    const response = await fetch(`${appState.API_URL}/progress`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${appState.authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      return true;
    } else {
      // Token is invalid, clear user data
      appState.clearUserData();
      return false;
    }
  } catch (error) {
    console.error("Token validation error:", error);
    return false;
  }
}

function extractConditionInfo(routineText) {
  // Expecting routine text to include lines like:
  // "Skin Condition: Normal" and "Confidence: 65.85%"
  const conditionMatch = routineText.match(/Skin Condition:\s*([^\n]+)/);
  const confidenceMatch = routineText.match(/Confidence:\s*([^\n]+)/);

  return {
    condition: conditionMatch ? conditionMatch[1].trim() : "Unknown",
    confidence: confidenceMatch ? confidenceMatch[1].trim() : "N/A"
  };
}
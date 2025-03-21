// Import all modular JS files
import { initializeNavigation, updateNavigation } from './navigation.js';
import { initializeTheme } from './theme.js';
import { initializeFileUpload, handleAnalysis } from './upload.js';
import { initializeAuth, checkTokenValidity } from './auth.js';
import { loadStoredRoutines } from './routine.js';
import { initializeProgressTracking, initializeProgressCalendar } from './progress.js';  // Import both functions

// Initialize user state from localStorage
let currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;
let authToken = localStorage.getItem("authToken") || null;
let guestRoutine = localStorage.getItem("guestRoutine") || null;
let guestRoutineType = localStorage.getItem("guestRoutineType") || null;

// App state accessible to imported modules
export const appState = {
  // Use a default API URL instead of relying on process.env
  API_URL: 'http://localhost:3000',
  currentUser,
  authToken,
  guestRoutine,
  guestRoutineType,
  
  updateCurrentUser(user) {
    this.currentUser = user;
    localStorage.setItem("currentUser", JSON.stringify(user));
  },
  
  setAuthToken(token) {
    this.authToken = token;
    localStorage.setItem("authToken", token);
  },
  
  setGuestRoutine(routine) {
    this.guestRoutine = routine;
    if (routine) {
      localStorage.setItem('guestRoutine', routine);
    } else {
      localStorage.removeItem('guestRoutine');
    }
  },
  
  setGuestRoutineType(type) {
    this.guestRoutineType = type;
    if (type) {
      localStorage.setItem('guestRoutineType', type);
    } else {
      localStorage.removeItem('guestRoutineType');
    }
  },
  
  clearUserData() {
    this.currentUser = null;
    this.authToken = null;
    localStorage.removeItem("currentUser");
    localStorage.removeItem("authToken");
  },
  
  clearAllData() {
    this.clearUserData();
    this.guestRoutine = null;
    this.guestRoutineType = null;
    localStorage.removeItem("guestRoutine");
    localStorage.removeItem("guestRoutineType");
    
    // Clear any displayed routines
    const routineDisplay = document.getElementById('routineDisplay');
    if (routineDisplay) {
      routineDisplay.innerHTML = '';
    }
  },
  
  loadGuestData() {
    this.guestRoutine = localStorage.getItem('guestRoutine');
    this.guestRoutineType = localStorage.getItem('guestRoutineType');
  }
};

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function() {
  // Load guest data from localStorage
  appState.loadGuestData();
  
  // Initialize all modules
  initializeNavigation(appState);
  initializeTheme();
  initializeFileUpload();
  initializeAuth(appState);
  initializeProgressTracking();  // Initialize progress tracking
  
  // Check if token is valid on page load
  checkTokenValidity(appState).then(isValid => {
    updateNavigation(appState);
    loadStoredRoutines();
    
    // Show home page initially
    document.getElementById("home").classList.add("active");
    
    // If we're on the routine page, load routines
    if (document.getElementById("routine").classList.contains("active")) {
      loadStoredRoutines();
    }
    
    // If we're on the progress page, initialize the calendar
    if (document.getElementById("progress").classList.contains("active")) {
      initializeProgressCalendar();
    }
  }).catch(error => {
    console.error("Error checking token validity:", error);
    updateNavigation(appState);
    document.getElementById("home").classList.add("active");
  });
});
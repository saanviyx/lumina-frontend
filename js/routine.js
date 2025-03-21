// frontend routine.js
import { appState } from './app.js';
import { showError, showSuccess } from './notification.js';

// Load and display stored routines
export async function loadStoredRoutines() {
  const routineDisplay = document.getElementById('routineDisplay');
  if (!routineDisplay) return;

  // Clear existing content
  routineDisplay.innerHTML = '<div class="loading">Loading routines...</div>';

  try {
    let analysis = [];

    // Refresh auth state from localStorage
    appState.authToken = localStorage.getItem("authToken");
    appState.currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    appState.guestRoutine = localStorage.getItem("guestRoutine");
    appState.guestRoutineType = localStorage.getItem("guestRoutineType");

    // Check if user is logged in
    if (appState.currentUser && appState.authToken) {
      // Fetch user's routines from the server
      const response = await fetch(`${appState.API_URL}/analysis/history`, {
        headers: {
          'Authorization': `Bearer ${appState.authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch routines');
      }

      const data = await response.json();
      analysis = data.analysis || [];
      
      // Clear guest routine after user logs in
      if (appState.guestRoutine) {
        appState.setGuestRoutine(null);
        appState.setGuestRoutineType(null);
      }
    } else if (appState.guestRoutine) {
      // For guest users, use the stored routine
      analysis = [{
        routine: appState.guestRoutine,
        date: new Date(),
        skinCondition: extractConditionInfo(appState.guestRoutine).condition,
        confidence: extractConditionInfo(appState.guestRoutine).confidence,
        selectedBudget: appState.guestRoutineType || 'budget',
        isGuest: true // Flag to identify guest analysis
      }];
    }

    // If no routines found
    if (analysis.length === 0) {
      routineDisplay.innerHTML = `
        <div class="no-routines">
          <h3>No Skincare Routines Found</h3>
          <p>Upload a photo to get your personalized skincare routine!</p>
          <button class="primary-button" id="goToUploadButton">
            <i class="fas fa-camera"></i> Upload Photo
          </button>
        </div>
      `;
      
      document.getElementById('goToUploadButton')?.addEventListener('click', () => {
        document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
        document.getElementById('upload').classList.add('active');
      });
      return;
    }

    // Check if user has reached the analysis limit
    let routinesHTML = '';
    if (appState.currentUser && appState.authToken) {
      // Add warning message about analysis limit
      routinesHTML += `
        <div class="analysis-limit-warning">
          <p><strong>Note:</strong> You have reached your limit of 5 skin analysis. 
          To create a new analysis, please delete an existing one.</p>
        </div>
      `;
    }
    
    // Display routines grouped by skin condition
    const conditionGroups = {};
    analysis.forEach(item => {
      // Ensure item.routine exists before calling extractConditionInfo
      if (!item.routine) {
        console.error("Missing routine data in analysis item:", item);
        return;
      }
      
      const condition = item.skinCondition || extractConditionInfo(item.routine).condition;
      if (!conditionGroups[condition]) {
        conditionGroups[condition] = [];
      }
      conditionGroups[condition].push(item);
    });
    
    // Create a card for each skin condition
    Object.keys(conditionGroups).forEach(condition => {
      const analysisItems = conditionGroups[condition];
      const latestAnalysis = analysisItems.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      )[0];
      
      // Safely create date object
      const date = new Date(latestAnalysis.date);
      const formattedDate = isNaN(date.getTime()) ? 
        'Unknown date' : 
        date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      
      const confidence = latestAnalysis.confidence || 
        (latestAnalysis.routine ? extractConditionInfo(latestAnalysis.routine).confidence : 'N/A');
      const budgetType = latestAnalysis.selectedBudget || 'budget'; // Default to budget if not set
      
      // Only show delete buttons for logged in users and not for guest routines
      const showDeleteButtons = appState.currentUser && appState.authToken && !latestAnalysis.isGuest;
      const isGuestView = latestAnalysis.isGuest; // Check if this is a guest routine
      
      routinesHTML += `
        <div class="condition-card" data-analysis-id="${latestAnalysis._id || ''}">
          <div class="condition-header">
            <h3>${condition}</h3>
            <div class="condition-meta">
              <span class="confidence">Confidence: ${confidence}</span>
              <span class="update-date">Last updated: ${formattedDate}</span>
              <span class="budget-type">${getBudgetTypeName(budgetType)}</span>
            </div>
          </div>
    
          ${showDeleteButtons ? `
          <button class="delete-routine-btn" data-id="${latestAnalysis._id}">
            <i class="fas fa-trash"></i> Delete
          </button>
          ` : ''}
    
          <div class="routine-steps">
            ${createRoutineSteps(latestAnalysis.routine, isGuestView)}
          </div>
        </div>
      `;
    });
    
    // Add usage instructions at the bottom if we have routines
    if (analysis.length > 0) {
      const latestAnalysis = analysis.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      )[0];
      
      if (latestAnalysis.routine) {
        const usageInstructions = extractUsageInstructions(latestAnalysis.routine);
        if (usageInstructions.length > 0) {
          routinesHTML += `
          <div class="instructions-card">
            <div class="instructions-header">
              <h3>Usage Instructions</h3>
            </div>
            <ul class="instructions-list">
              ${usageInstructions.map(instruction => `<li>${instruction}</li>`).join('')}
            </ul>
          </div>
        `;
        }
      }
    }

    routineDisplay.innerHTML = routinesHTML;
    
    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-routine-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const analysisId = btn.getAttribute('data-id');
        if (analysisId) {
          await deleteAnalysis(analysisId);
        }
      });
    });

    // Add event listeners for login buttons in blurred content
    document.querySelectorAll('.login-to-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Store the current page to return to after login
        localStorage.setItem("returnToPage", "routine");
        
        // Navigate to login page
        document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
        document.getElementById('login').classList.add('active');
      });
    });
  } catch (error) {
    console.error('Error loading routines:', error);
    routineDisplay.innerHTML = `
      <div class="error-message">
        <p>Failed to load routines. Please try again later.</p>
      </div>
    `;
    showError(`Failed to load routines: ${error.message}`, 'Loading Error');
  }
}

// Delete an analysis
async function deleteAnalysis(analysisId) {
  try {
    if (!analysisId) {
      throw new Error("Missing analysis ID");
    }
    
    const response = await fetch(`${appState.API_URL}/analysis/${analysisId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${appState.authToken}`
      }
    });
    
    if (response.ok) {
      // Show success notification
      showSuccess('Routine has been successfully deleted', 'Routine Deleted');
      
      // Refresh the routines display
      loadStoredRoutines();
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `Error: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting analysis:', error);
    showError(`Error deleting routine: ${error.message}`, 'Deletion Failed');
  }
}

// Helper function to get budget type display name
function getBudgetTypeName(budgetType) {
  switch (budgetType) {
    case 'budget': return 'Budget-Friendly';
    case 'mid': return 'Mid-Range';
    case 'premium': return 'Premium';
    default: return 'Selected';
  }
}

// Create HTML for routine steps from routine text
function createRoutineSteps(routineText, isGuest = false) {
  if (!routineText) {
    return '<p class="no-steps">No routine steps found.</p>';
  }
  
  const lines = routineText.split('\n');
  const steps = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and section headers
    if (!line || line.includes('Skin Condition:') || line.includes('Confidence:') || 
        line.includes('Recommended Skincare') || line.startsWith('Usage Instructions:')) {
      continue;
    }
    
    // Check if line contains a product step
    const stepMatch = line.match(/^(\w+):\s*(.*?)(?:\s*([\£\$\d]+(?:\.\d{2})?))?$/);
    if (stepMatch) {
      const category = stepMatch[1].toUpperCase(); // Convert category to uppercase
      const product = stepMatch[2] ? stepMatch[2] : "";
  
      // Remove any budget labels
      const cleanProduct = product.replace(/\*\*(?:Budget-friendly|Mid-range|Premium)\*\*/g, '').trim();
      steps.push({ 
        category, 
        product: cleanProduct 
      });
    }
  }
  
  if (steps.length === 0) {
    return '<p class="no-steps">No routine steps found.</p>';
  }
  
  if (isGuest) {
    // Create blurred content with login button for guest users
    return `
      <div class="blurred-routine">
        <div class="blurred-content">
          ${steps.map(step => `
            <div class="routine-step blurred">
              <span class="step-category">${step.category}</span>
              <span class="step-product">••••••••••••••••••••</span>
            </div>
          `).join('')}
        </div>
        <div class="login-overlay">
          <i class="fas fa-lock" style="font-size: 2rem; margin-bottom: 1rem;"></i>
          <p>Login to view your full routine</p>
          <button class="primary-button login-to-view-btn">
            <i class="fas fa-user"></i> Login to View
          </button>
        </div>
      </div>
    `;
  }
  
  // Standard display for logged-in users
  return steps.map(step => `
    <div class="routine-step">
      <span class="step-category">${step.category}</span>
      <span class="step-product">${step.product}</span>
    </div>
  `).join('');
}

// Extract usage instructions from routine text
function extractUsageInstructions(routineText) {
  if (!routineText) return [];
  
  const usageSection = routineText.split('\n\n').find(section => 
    section && section.startsWith('Usage Instructions:')
  );
  
  if (!usageSection) return [];
  
  return usageSection
    .replace('Usage Instructions:', '')
    .trim()
    .split('\n')
    .map(instruction => instruction.replace(/^\d+\.\s*/, '').trim())
    .filter(instruction => instruction);
}

// Extract condition info from routine text
function extractConditionInfo(routineText) {
  if (!routineText) {
    return {
      condition: "Unknown",
      confidence: "N/A"
    };
  }
  
  const conditionMatch = routineText.match(/Skin Condition:\s*([^\n]+)/);
  const confidenceMatch = routineText.match(/Confidence:\s*([^\n]+)/);

  return {
    condition: conditionMatch ? conditionMatch[1].trim() : "Unknown",
    confidence: confidenceMatch ? confidenceMatch[1].trim() : "N/A"
  };
}
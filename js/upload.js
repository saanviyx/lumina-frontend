import { appState } from './app.js';
import { showError, showSuccess} from './notification.js';

let uploadedImage = null;
let currentRoutine = null;
let currentSkinCondition = "";
let currentConfidence = "";
const ANALYSIS_MESSAGES = [
  "Analyzing your skin texture...",
  "Identifying problem areas...",
  "Detecting skin conditions...",
  "Analyzing pore visibility...",
  "Checking for signs of sensitivity...",
  "Evaluating hydration levels...",
  "Analyzing skin tone distribution...",
  "Generating personalized recommendations..."
];

export function initializeFileUpload() {
  const fileInput = document.getElementById('fileInput');
  const submitButton = document.getElementById('submitButton');

  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }

  if (submitButton) {
    submitButton.addEventListener('click', handleSubmit);
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const preview = document.getElementById('preview');
  const reader = new FileReader();

  reader.onload = function (e) {
    uploadedImage = e.target.result;
    preview.innerHTML = `
      <div class="preview-container">
        <img src="${uploadedImage}" alt="Preview" class="preview-image">
        <button id="removeImageBtn" class="remove-image-btn">
          <i class="fas fa-times"></i> Remove
        </button>
      </div>
    `;
    
    // Add event listener to the remove button
    document.getElementById('removeImageBtn').addEventListener('click', removeUploadedImage);
  };

  reader.readAsDataURL(file);
}

// Function to remove the uploaded image
function removeUploadedImage() {
  // Clear the preview
  const preview = document.getElementById('preview');
  preview.innerHTML = '';
  
  // Reset the file input
  const fileInput = document.getElementById('fileInput');
  fileInput.value = '';
  
  // Clear the uploaded image variable
  uploadedImage = null;
}

// Function to show different analysis messages while waiting
function showAnalysisMessages(resultDiv) {
  let messageIndex = 0;
  
  resultDiv.innerHTML = `
    <div class="loading-indicator">
      <div class="spinner"></div>
      <p id="analysis-message">${ANALYSIS_MESSAGES[0]}</p>
      <div class="progress-bar">
        <div class="progress-fill" id="progress-fill"></div>
      </div>
    </div>
  `;
  
  const progressFill = document.getElementById('progress-fill');
  const messageElement = document.getElementById('analysis-message');
  
  // Update the progress bar and messages
  const messageInterval = setInterval(() => {
    messageIndex = (messageIndex + 1) % ANALYSIS_MESSAGES.length;
    messageElement.textContent = ANALYSIS_MESSAGES[messageIndex];
    
    // Calculate progress percentage
    const progress = ((messageIndex + 1) / ANALYSIS_MESSAGES.length) * 100;
    progressFill.style.width = `${progress}%`;
  }, 3000);
  
  return messageInterval;
}

export async function handleSubmit() {
  const resultDiv = document.getElementById('result');

  if (!uploadedImage) {
    // Use notification instead of inline error
    showError('Please upload an image first.', 'Upload Required');
    return;
  }

  // Show animated loading indicator with changing messages
  const messageInterval = showAnalysisMessages(resultDiv);

  try {
    // Send the image to the ML API
    const response = await fetch(`${appState.API_URL}/ml/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: uploadedImage,
      }),
    });

    const data = await response.json();
    // Clear the message interval
    clearInterval(messageInterval);

    if (data.success) {
      // Store the routine and extract condition info
      currentRoutine = data.routine;
      const conditionInfo = extractConditionInfo(data.routine);
      currentSkinCondition = conditionInfo.condition;
      currentConfidence = conditionInfo.confidence;
      
      // Extract price ranges from the routine
      const priceRanges = extractPriceRanges(data.routine);

      // Set the modal HTML to the result div
      const modalHtml = `
        <div class="modal" id="analysisModal">
          <div class="modal-content">
            <div class="analysis-result">
              <div class="analysis-header" style="margin-bottom: 5px">
                <h2>Analysis Complete!</h2>
                <p class="condition-info" style="margin-bottom: 0px">Detected: <strong>${currentSkinCondition}</strong> (Confidence: ${currentConfidence})</p>
              </div>
              <div class="budget-selection">
                <h3>Select Your Budget Preference</h3>
                <div class="budget-options">
                  <div class="budget-option" data-budget="budget">
                    <h4>Budget-Friendly</h4>
                    <p class="price-range">${priceRanges.budget}</p>
                    <button class="budget-select-btn" data-budget="budget">Select</button>
                  </div>
                  <div class="budget-option" data-budget="mid">
                    <h4>Mid-Range</h4>
                    <p class="price-range">${priceRanges.mid}</p>
                    <button class="budget-select-btn" data-budget="mid">Select</button>
                  </div>
                  <div class="budget-option" data-budget="premium">
                    <h4>Premium</h4>
                    <p class="price-range">${priceRanges.premium}</p>
                    <button class="budget-select-btn" data-budget="premium">Select</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      resultDiv.innerHTML = modalHtml;

      // Show the modal automatically after the content is rendered
      document.getElementById('analysisModal').style.display = 'block';

      // Add event listeners to budget selection buttons
      document.querySelectorAll('.budget-select-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          const selectedBudget = e.target.getAttribute('data-budget');
          saveRoutineWithBudget(selectedBudget);
        });
      });

      // Store routine for guest users
      appState.setGuestRoutine(data.routine);
    } else {
      // Use notification instead of inline error
      showError(`Analysis failed: ${data.message}`, 'Analysis Failed');
    }
  } catch (error) {
    clearInterval(messageInterval);
    console.error('Error analyzing image:', error);
    // Use notification instead of inline error
    showError('An error occurred during analysis. Please try again.', 'Analysis Error');
  }
}

// Extract condition info from the routine text
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

// Extract price ranges for each budget option
function extractPriceRanges(routineText) {
  let budgetPrices = [];
  let midPrices = [];
  let premiumPrices = [];
  
  // Extract all product prices using regex
  const budgetMatches = routineText.matchAll(/Budget-friendly:\s*(.*?)(?:\$(\d+(?:\.\d+)?))?/g);
  const midMatches = routineText.matchAll(/Mid-range:\s*(.*?)(?:\$(\d+(?:\.\d+)?))?/g);
  const premiumMatches = routineText.matchAll(/Premium:\s*(.*?)(?:\$(\d+(?:\.\d+)?))?/g);
  
  // Convert matches to price arrays
  for (const match of budgetMatches) {
    if (match[2]) budgetPrices.push(parseFloat(match[2]));
  }
  
  for (const match of midMatches) {
    if (match[2]) midPrices.push(parseFloat(match[2]));
  }
  
  for (const match of premiumMatches) {
    if (match[2]) premiumPrices.push(parseFloat(match[2]));
  }
  
  // Calculate ranges if prices are available
  const budgetRange = budgetPrices.length > 0 ? 
    `$${Math.min(...budgetPrices)} - $${Math.max(...budgetPrices)}` : "$10 - $20";
  
  const midRange = midPrices.length > 0 ? 
    `$${Math.min(...midPrices)} - $${Math.max(...midPrices)}` : "$20 - $40";
  
  const premiumRange = premiumPrices.length > 0 ? 
    `$${Math.min(...premiumPrices)} - $${Math.max(...premiumPrices)}` : "$40+";
  
  return {
    budget: budgetRange,
    mid: midRange,
    premium: premiumRange
  };
}

// Fixed implementation for filterRoutineByBudget
function filterRoutineByBudget(routine, budgetType) {
  const validCategories = ['Cleanser', 'Toner', 'Serum', 'Treatment', 'Moisturizer', 'Sunscreen'];
  
  // Split the routine text into lines for easier processing
  const lines = routine.split('\n');
  
  // Find header lines (Skin Condition and Confidence)
  const headerLines = lines.filter(line => 
    line.includes('Skin Condition:') || line.includes('Confidence:')
  );
  
  // Start building the filtered routine with header
  let filteredRoutine = headerLines.join('\n') + '\n\n';
  filteredRoutine += 'Recommended Skincare Routine:\n\n';
  
  // Find usage instruction lines
  const usageStartIndex = lines.findIndex(line => line.startsWith('Usage Instructions:'));
  const usageLines = usageStartIndex >= 0 ? lines.slice(usageStartIndex) : [];
  
  // Look for products by category
  for (const category of validCategories) {
    // Find the line index for this category
    const categoryIndex = lines.findIndex(line => line.trim() === category + ':');
    
    if (categoryIndex >= 0) {
      // Get budget prefix based on selected budget type
      let budgetPrefix;
      if (budgetType === 'budget') {
        budgetPrefix = 'BudgetFriendly:';
      } else if (budgetType === 'mid') {
        budgetPrefix = 'MidRange:';
      } else if (budgetType === 'premium') {
        budgetPrefix = 'Premium:';
      }
      
      // Look for the specific budget line after the category
      let foundProduct = false;
      for (let i = categoryIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Stop if we hit another category or empty line
        if (validCategories.some(cat => line === cat + ':') || line === '') {
          break;
        }
        
        // Check if this line contains our budget prefix
        if (line.toLowerCase().startsWith(budgetPrefix.toLowerCase())) {
          // Extract product info and add to filtered routine
          const productInfo = line.substring(budgetPrefix.length).trim();
          filteredRoutine += `${category}: ${productInfo}\n\n`;
          foundProduct = true;
          break;
        }
      }
      
      // Log if no product is found for this category and budget type
      if (!foundProduct) {
        console.log(`No product found for ${category} in ${budgetType} budget.`);
      }
    }
  }
  
  // Add usage instructions at the end
  if (usageLines.length > 0) {
    filteredRoutine += usageLines.join('\n');
  }
  
  return filteredRoutine;
}

// Save routine with selected budget
async function saveRoutineWithBudget(budgetType) {
  const resultDiv = document.getElementById('result');
  
  // Filter routine for selected budget
  const filteredRoutine = filterRoutineByBudget(currentRoutine, budgetType);
  
  // Update display to show loading
  resultDiv.innerHTML = `
    <div class="loading-indicator">
      <div class="spinner"></div>
      <p>Saving your selected routine...</p>
    </div>
  `;
  
  try {
    // Refresh auth state from localStorage before checking
    // This ensures we have the latest auth state after login
    const currentAuthToken = localStorage.getItem("authToken");
    const currentUserData = localStorage.getItem("currentUser");
    
    // Check if user is logged in using the freshly retrieved values
    if (!currentAuthToken || !currentUserData) {
      // Store as guest routine and prompt login
      appState.setGuestRoutine(filteredRoutine);
      // Store the budget type selection for guest users
      appState.setGuestRoutineType(budgetType);
      
      resultDiv.innerHTML = `
        <div class="analysis-result" style="background-color: var(--light-bg);">
          <div class="analysis-header" style="padding-top: 0rem; justify-content: center; margin-bottom: 0px;">
            <h3 style="margin-right: 2px;">Routine Created 📌</h3>
            <p style="font-size: 16px; margin-top: 0px">Your routine has been saved temporarily.</p>
          </div>
          <div class="action-buttons" style="justify-content: center;">
            <button class="primary-button" id="viewRoutineButton" style="width: 160px; margin-top: 0px">
              <i class="fas fa-list"></i> View Routine
            </button>
          </div>
        </div>
      `;
      
      document.getElementById('viewRoutineButton').addEventListener('click', () => {
        document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
        document.getElementById('routine').classList.add('active');
        import('./routine.js').then(module => {
          module.loadStoredRoutines();
        });
      });
      
      return;
    }
    
    // If we got here, the user is logged in, so update appState if needed
    if (currentAuthToken !== appState.authToken) {
      appState.setAuthToken(currentAuthToken);
    }
    
    if (currentUserData !== JSON.stringify(appState.currentUser)) {
      appState.updateCurrentUser(JSON.parse(currentUserData));
    }
    
    // Save to the analysis collection
    const response = await fetch(`${appState.API_URL}/analysis/save`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${appState.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        routine: filteredRoutine,
        skinCondition: currentSkinCondition,
        confidence: currentConfidence,
        selectedBudget: budgetType,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    
    // Clear guest routine as it's now saved to the database
    appState.setGuestRoutine(null);
    appState.setGuestRoutineType(null);
    localStorage.removeItem("guestUploadedImage");

    // Message based on whether it was an update or new analysis
    const actionText = data.updated ? "updated" : "created";
    const emoji = data.updated ? "🔄" : "📌";
    
    // Show success notification
    showSuccess(`Your ${getBudgetTypeName(budgetType)} routine was successfully ${actionText}.`, 'Routine Saved');
    
    // Show success and option to view routine
    resultDiv.innerHTML = `
      <div class="analysis-result" style="background-color: var(--light-bg);">
        <div class="analysis-header" style="padding-top: 0rem; justify-content: center; margin-bottom: 0px;">
          <h3 style="margin-right: 2px;">Routine ${actionText.charAt(0).toUpperCase() + actionText.slice(1)} ${emoji}</h3>
          <p style="font-size: 16px; margin-top: 0px">Your ${getBudgetTypeName(budgetType)} routine is ready.</p>
        </div>
        <div class="action-buttons" style="justify-content: center;">
          <button class="primary-button" id="viewRoutineButton" style="width: 160px; margin-top: 0px">
            <i class="fas fa-list"></i> View Routine
          </button>
        </div>
      </div>
    `;
    
    // Add event listener to view button
    document.getElementById('viewRoutineButton').addEventListener('click', () => {
      document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
      document.getElementById('routine').classList.add('active');
      // Import and call loadStoredRoutines from routine.js
      import('./routine.js').then(module => {
        module.loadStoredRoutines();
      });
    });
  } catch (error) {
    console.error('Error saving routine:', error);
    // Use notification instead of inline error
    showError(`Failed to save routine: ${error.message}`, 'Save Error');
    
    resultDiv.innerHTML = `
      <div class="error" style="padding-top: 2px; padding-bottom: 2px">
        <p style="margin-bottom: 0px">An error occurred while saving your routine.</p>
        <button class="secondary-button" id="tryAgainButton" style="margin-top: 5px">Try Again</button>
      </div>
    `;
    
    document.getElementById('tryAgainButton').addEventListener('click', () => {
      handleSubmit();
    });
  }
}

function getBudgetTypeName(budgetType) {
  switch (budgetType) {
    case 'budget': return 'Budget-Friendly';
    case 'mid': return 'Mid-Range';
    case 'premium': return 'Premium';
    default: return 'Selected';
  }
}

export const handleAnalysis = handleSubmit;
import { appState } from './app.js';
import { showNotification, showError, showSuccess } from './notification.js';

// Export progress tracking functions
export function initializeProgressCalendar() {
    const calendarDays = document.getElementById('calendarDays');
    const currentMonthDisplay = document.getElementById('currentMonth');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const monthlyCompletion = document.getElementById('monthlyCompletion');
    const currentStreak = document.getElementById('currentStreak');
    const longestStreak = document.getElementById('longestStreak');
    
    // Track calendar data
    let calendarData = {
        entries: [],
        stats: {
            currentStreak: 0,
            longestStreak: 0,
            monthlyCompletion: 0
        }
    };
    
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    
    // Fetch calendar data from server
    async function fetchCalendarData() {
        try {
            const response = await fetch(`${appState.API_URL}/progress`, {
                headers: {
                    'Authorization': `Bearer ${appState.authToken}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch calendar data');
            }
            
            const data = await response.json();
            
            // Ensure entries exists
            calendarData.entries = data.calendar.entries || [];
            calendarData.stats = data.calendar.stats || {
                currentStreak: 0,
                longestStreak: 0,
                monthlyCompletion: 0
            };
            
            // Update calendar with fetched data
            generateCalendar(currentMonth, currentYear);
            updateStats();
        } catch (error) {
            console.error('Error fetching calendar data:', error);
            showError('Error loading progress data. Please try again.');
        }
    }
    
    // Format date as YYYY-MM-DD
    function formatDate(date) {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();
        
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        
        return [year, month, day].join('-');
    }
    
    // Check if a day is completed
    function isDayCompleted(year, month, day) {
        const dateStr = formatDate(new Date(year, month, day));
        return calendarData.entries.some(entry => 
            entry.date === dateStr && entry.completed);
    }
    
    // Check if a day is marked as not completed
    function isDayUncompleted(year, month, day) {
        const dateStr = formatDate(new Date(year, month, day));
        return calendarData.entries.some(entry => 
            entry.date === dateStr && entry.completed === false);
    }
    
    // Mark a day as completed or uncompleted
    async function toggleDayCompletion(year, month, day, completed) {
        const date = formatDate(new Date(year, month, day));
        
        try {
            const endpoint = completed ? `${appState.API_URL}/progress/complete` : `${appState.API_URL}/progress/uncomplete`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${appState.authToken}`
                },
                body: JSON.stringify({ date })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update day status');
            }
            
            const data = await response.json();
            
            // Update stats with new data
            calendarData.stats = data.stats;
            
            // Refetch calendar data to refresh the view
            await fetchCalendarData();
            
            showSuccess(`Day marked as ${completed ? 'completed' : 'not completed'}.`);
        } catch (error) {
            console.error('Error updating day status:', error);
            showError('Error updating progress. Please try again.');
        }
    }
    
    function generateCalendar(month, year) {
        // Clear previous calendar
        calendarDays.innerHTML = '';
        
        // Update month display
        const monthNames = ["January", "February", "March", "April", "May", "June", 
                         "July", "August", "September", "October", "November", "December"];
        currentMonthDisplay.textContent = `${monthNames[month]} ${year}`;
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Add empty cells for days of week before start of month
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarDays.appendChild(emptyDay);
        }
        
        // Add days of month
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = i;
            
            const dateToCheck = new Date(year, month, i);
            const today = new Date();
            
            // Format today for comparison
            today.setHours(0, 0, 0, 0);
            
            // Check if this is today
            if (dateToCheck.getDate() === today.getDate() && 
                dateToCheck.getMonth() === today.getMonth() && 
                dateToCheck.getFullYear() === today.getFullYear()) {
                dayElement.classList.add('today');
            }
            
            // Check if this is a completed day
            if (isDayCompleted(year, month, i)) {
                dayElement.classList.add('completed');
            } 
            // Check if this is explicitly marked as uncompleted - add missed class for red coloring
            else if (isDayUncompleted(year, month, i)) {
                dayElement.classList.add('missed');
            }
            
            // Make the day clickable if it's today or in the past
            if (dateToCheck <= today) {
                dayElement.classList.add('clickable');
                
                dayElement.addEventListener('click', function() {
                    showCalendarDayActionDialog(year, month, i);
                });
            }
            
            calendarDays.appendChild(dayElement);
        }
        
        // Update statistics
        updateStats();
    }
    
    function updateStats() {
        // Update stats display
        monthlyCompletion.textContent = `${calendarData.stats.monthlyCompletion}%`;
        currentStreak.textContent = `${calendarData.stats.currentStreak} days`;
        longestStreak.textContent = `${calendarData.stats.longestStreak} days`;
    }
    
    // Show dialog for marking day as completed/uncompleted
    function showCalendarDayActionDialog(year, month, day) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);
        const isCompleted = isDayCompleted(year, month, day);
        
        // Create dialog HTML
        const dialog = document.createElement('div');
        dialog.className = 'calendar-dialog';
        dialog.innerHTML = `
            <div class="calendar-dialog-content">
                <div class="calendar-dialog-header">
                    <h3>${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                    <span class="close-calendar-dialog">&times;</span>
                </div>
                <div class="calendar-dialog-body">
                    <p style="font-size: 16px; margin-left: 4px">Did you complete your skincare routine on this day?</p>
                    <div class="calendar-dialog-actions">
                        <button id="markCompleted" class="${isCompleted ? 'active' : ''}">
                            <i class="fas fa-check"></i> Completed
                        </button>
                        <button id="markUncompleted" class="${!isCompleted ? 'active' : ''}">
                            <i class="fas fa-times"></i> Not Completed
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Show dialog
        setTimeout(() => {
            dialog.style.opacity = '1';
        }, 10);
        
        // Set up event listeners
        dialog.querySelector('.close-calendar-dialog').addEventListener('click', () => {
            closeCalendarDialog(dialog);
        });
        
        dialog.querySelector('#markCompleted').addEventListener('click', async () => {
            await toggleDayCompletion(year, month, day, true);
            closeCalendarDialog(dialog);
        });
        
        dialog.querySelector('#markUncompleted').addEventListener('click', async () => {
            await toggleDayCompletion(year, month, day, false);
            closeCalendarDialog(dialog);
        });
        
        // Close dialog when clicking outside
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeCalendarDialog(dialog);
            }
        });
    }
    
    // Close dialog function
    function closeCalendarDialog(dialog) {
        dialog.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(dialog);
        }, 300);
    }
    
    // Event listeners for month navigation
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        generateCalendar(currentMonth, currentYear);
    });
    
    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        generateCalendar(currentMonth, currentYear);
    });
    
    // Initialize calendar - make sure this runs immediately
    fetchCalendarData();
}

// Function to initialize event listeners
export function initializeProgressTracking() {
    // Listen for page navigation
    document.querySelectorAll('a[data-page]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            
            if (page === 'progress') {
                // Initialize calendar when progress page is shown - with slight delay to ensure DOM is ready
                setTimeout(initializeProgressCalendar, 100);
            }
        });
    });
    
    // Auto-initialize if we're already on the progress page
    if (document.getElementById('calendarDays')) {
        initializeProgressCalendar();
    }
}
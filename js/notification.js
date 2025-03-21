// notification.js - Create a central notification system with prioritized ordering
export const initializeNotifications = () => {
    // Create notification container if it doesn't exist
    if (!document.querySelector('.notification-container')) {
      const container = document.createElement('div');
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
  };
  
  // Priority order for notification types (highest first)
  const PRIORITY_ORDER = {
    'error': 1,
    'warning': 2,
    'success': 3,
    'info': 4
  };
  
  // Show a notification toast
  export const showNotification = (options) => {
    const { 
      type = 'info', 
      title = '', 
      message = '', 
      duration = 5000 
    } = options;
    
    // Get or create container
    let container = document.querySelector('.notification-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    toast.dataset.priority = PRIORITY_ORDER[type] || 5; // Default priority if type not found
    
    // Get icon based on notification type
    let iconClass = '';
    switch(type) {
      case 'error':
        iconClass = 'fas fa-exclamation-circle';
        break;
      case 'success':
        iconClass = 'fas fa-check-circle';
        break;
      case 'warning':
        iconClass = 'fas fa-exclamation-triangle';
        break;
      default:
        iconClass = 'fas fa-info-circle';
    }
    
    // Create toast HTML structure
    toast.innerHTML = `
      <div class="notification-icon ${type}">
        <i class="${iconClass}"></i>
      </div>
      <div class="notification-content">
        <h4 class="notification-title">${title}</h4>
        <p class="notification-message">${message}</p>
      </div>
      <button class="notification-close" aria-label="Close notification">×</button>
      <div class="notification-progress">
        <div class="notification-progress-inner"></div>
      </div>
    `;
    
    // Add toast to container in the correct position based on priority
    insertToastByPriority(container, toast);
    
    // Add event listener to close button
    const closeBtn = toast.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      closeToast(toast);
    });
    
    // Auto close after duration
    const timeoutId = setTimeout(() => {
      closeToast(toast);
    }, duration);
    
    // Store timeout ID for potential early closing
    toast.dataset.timeoutId = timeoutId;
    
    // Return toast element in case caller wants to manage it
    return toast;
  };
  
  // Insert the toast in the correct position based on priority
  const insertToastByPriority = (container, toast) => {
    const priority = parseInt(toast.dataset.priority);
    const existingToasts = Array.from(container.querySelectorAll('.notification-toast'));
    
    // Find the first toast with lower priority (higher number)
    const insertBeforeToast = existingToasts.find(
      existing => parseInt(existing.dataset.priority) > priority
    );
    
    if (insertBeforeToast) {
      container.insertBefore(toast, insertBeforeToast);
    } else {
      container.appendChild(toast);
    }
  };
  
  // Close a toast notification
  const closeToast = (toast) => {
    // Clear the timeout to prevent double-closing
    if (toast.dataset.timeoutId) {
      clearTimeout(parseInt(toast.dataset.timeoutId));
    }
    
    // Add closing animation
    toast.classList.add('closing');
    
    // Remove after animation completes
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  };
  
  // Convenience methods for different notification types
  export const showError = (message, title = 'Error') => {
    return showNotification({
      type: 'error',
      title,
      message
    });
  };
  
  export const showSuccess = (message, title = 'Success') => {
    return showNotification({
      type: 'success',
      title,
      message
    });
  };
  
  export const showInfo = (message, title = 'Information') => {
    return showNotification({
      type: 'info',
      title,
      message
    });
  };
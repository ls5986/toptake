// Console filter to suppress chrome extension errors
// These errors are from browser extensions and not related to our app

const originalError = console.error;
const originalWarn = console.warn;

// Filter out chrome extension errors
const shouldFilterMessage = (message: string): boolean => {
  return (
    message.includes('chrome-extension://invalid/') ||
    message.includes('net::ERR_FAILED') ||
    message.includes('inject.bundle.js')
  );
};

console.error = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  if (!shouldFilterMessage(message)) {
    originalError.apply(console, args);
  }
};

console.warn = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  if (!shouldFilterMessage(message)) {
    originalWarn.apply(console, args);
  }
};

// Also filter out network errors from chrome extensions
const originalFetch = window.fetch;
window.fetch = async (...args: any[]) => {
  try {
    return await originalFetch.apply(window, args);
  } catch (error: any) {
    // Filter out chrome extension network errors
    if (error?.message?.includes('chrome-extension://invalid/')) {
      // Return a mock response to prevent the error from bubbling up
      return new Response('', { status: 200, statusText: 'OK' });
    }
    throw error;
  }
};

import type { ContentAutofillMessage } from '../shared/types/messages';

const isVisible = (element: HTMLElement): boolean => {
  const style = window.getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none';
};

const findInput = (selector: string): HTMLInputElement | null => {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (!input || !isVisible(input)) {
    return null;
  }
  return input;
};

const setValue = (input: HTMLInputElement, value: string): void => {
  input.focus();
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

const fillCredentials = (message: ContentAutofillMessage): void => {
  const passwordInput =
    findInput('input[type="password"]') ||
    findInput('input[autocomplete="current-password"]') ||
    findInput('input[name*="password" i]');

  const usernameInput =
    findInput('input[type="email"]') ||
    findInput('input[name*="user" i]') ||
    findInput('input[name*="email" i]') ||
    findInput('input[type="text"]');

  if (usernameInput) {
    setValue(usernameInput, message.username);
  }
  if (passwordInput) {
    setValue(passwordInput, message.secret);
  }
};

chrome.runtime.onMessage.addListener((message: ContentAutofillMessage) => {
  if (message.type !== 'content:autofill') {
    return;
  }
  fillCredentials(message);
});

import { Injectable } from '@angular/core';
import { CandidateSession } from './candidate-storage.service';
import { GOOGLE_CLIENT_ID } from './google-auth.config';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdApi {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

type SignInHandler = (session: CandidateSession) => void;
type ErrorHandler = (message: string) => void;

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private scriptUrl = 'https://accounts.google.com/gsi/client';
  private scriptLoading?: Promise<GoogleIdApi>;
  private initialized = false;

  // The button currently on screen (login or registration page).
  private onSignIn?: SignInHandler;
  private onError?: ErrorHandler;

  isConfigured() {
    return !GOOGLE_CLIENT_ID.startsWith('YOUR_');
  }

  async renderButton(
    container: HTMLElement,
    onSignIn: SignInHandler,
    onError: ErrorHandler
  ) {
    const googleId = await this.loadScript();

    this.onSignIn = onSignIn;
    this.onError = onError;

    if (!this.initialized) {
      googleId.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: response => this.handleCredential(response)
      });

      this.initialized = true;
    }

    googleId.renderButton(container, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: Math.min(container.offsetWidth || 336, 400)
    });
  }

  signOut() {
    window.google?.accounts.id.disableAutoSelect();
  }

  private handleCredential(response: GoogleCredentialResponse) {
    try {
      const payload = this.decodeToken(response.credential);

      if (payload.aud !== GOOGLE_CLIENT_ID || !payload.email_verified) {
        this.onError?.('Your Google account could not be verified.');
        return;
      }

      this.onSignIn?.({
        displayName: payload.name || payload.email,
        email: payload.email.toLowerCase()
      });
    } catch {
      this.onError?.('Google sign-in failed. Please try again.');
    }
  }

  // Reads the ID token payload. Without a backend we can't verify the
  // signature, so this is only as trustworthy as the browser it runs in.
  private decodeToken(token: string): {
    aud: string;
    email: string;
    email_verified: boolean;
    name?: string;
  } {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));

    return JSON.parse(new TextDecoder().decode(bytes));
  }

  private loadScript(): Promise<GoogleIdApi> {
    this.scriptLoading ??= new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) {
        resolve(window.google.accounts.id);
        return;
      }

      const script = document.createElement('script');
      script.src = this.scriptUrl;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google!.accounts.id);
      script.onerror = () => {
        this.scriptLoading = undefined;
        reject(new Error('Unable to load Google sign-in.'));
      };

      document.head.appendChild(script);
    });

    return this.scriptLoading;
  }
}

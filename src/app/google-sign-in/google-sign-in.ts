import { AfterViewInit, Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { CandidateSession } from '../candidate-storage.service';
import { GoogleAuthService } from '../google-auth.service';

@Component({
  selector: 'app-google-sign-in',
  template: `
    <div class="auth-divider"><span>or</span></div>

    <div #buttonHost class="google-button-host"></div>

    @if (errorMessage()) {
    <p class="error-message">
      {{ errorMessage() }}
    </p>
    }
  `
})
export class GoogleSignIn implements AfterViewInit {
  private googleAuth = inject(GoogleAuthService);

  signedIn = output<CandidateSession>();

  buttonHost = viewChild.required<ElementRef<HTMLElement>>('buttonHost');

  errorMessage = signal('');

  async ngAfterViewInit() {
    if (!this.googleAuth.isConfigured()) {
      this.errorMessage.set(
        'Google sign-in is not configured yet. Add your Client ID in google-auth.config.ts.'
      );
      return;
    }

    try {
      await this.googleAuth.renderButton(
        this.buttonHost().nativeElement,
        session => {
          this.errorMessage.set('');
          this.signedIn.emit(session);
        },
        message => this.errorMessage.set(message)
      );
    } catch {
      this.errorMessage.set(
        'Unable to load Google sign-in. Check your internet connection.'
      );
    }
  }
}

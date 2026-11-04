import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthShell } from '../auth-shell/auth-shell';
import { CandidateSession, CandidateStorageService } from '../candidate-storage.service';
import { GoogleSignIn } from '../google-sign-in/google-sign-in';

@Component({
  selector: 'app-registration',
  imports: [FormsModule, AuthShell, GoogleSignIn],
  templateUrl: './registration.html'
})
export class Registration {
  private candidateStorage = inject(CandidateStorageService);

  // Emits the registered email so the login form can be prefilled.
  registered = output<string>();
  loginRequested = output<void>();

  // Google users skip registration and go straight to the portal.
  googleSignedIn = output<CandidateSession>();

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  registrationError = '';
  showPassword = signal(false);

  register() {
    this.registrationError = this.validate();

    if (this.registrationError) {
      return;
    }

    const candidate = this.candidateStorage.register(
      this.fullName,
      this.email,
      this.password
    );

    this.registered.emit(candidate.email);
  }

  private validate() {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!this.fullName.trim()) {
      return 'Please enter your full name.';
    }

    if (!emailPattern.test(this.email.trim())) {
      return 'Please enter a valid email address.';
    }

    if (this.candidateStorage.isEmailRegistered(this.email)) {
      return 'This email is already registered. Please login.';
    }

    if (this.password.length < 6) {
      return 'Password must be at least 6 characters.';
    }

    if (this.password !== this.confirmPassword) {
      return 'Passwords do not match.';
    }

    return '';
  }
}

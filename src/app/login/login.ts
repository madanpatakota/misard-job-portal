import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthShell } from '../auth-shell/auth-shell';
import { CandidateSession, CandidateStorageService } from '../candidate-storage.service';
import { GoogleSignIn } from '../google-sign-in/google-sign-in';

@Component({
  selector: 'app-login',
  imports: [FormsModule, AuthShell, GoogleSignIn],
  templateUrl: './login.html'
})
export class Login implements OnInit {
  private candidateStorage = inject(CandidateStorageService);

  // Set after registration so the new candidate can log in straight away.
  initialEmail = input('');
  successMessage = input('');

  loggedIn = output<CandidateSession>();
  registerRequested = output<void>();

  email = '';
  password = '';
  errorMessage = '';
  showPassword = signal(false);

  ngOnInit() {
    this.email = this.initialEmail();
  }

  login() {
    if (!this.email.trim() || !this.password) {
      this.errorMessage = 'Please enter your email and password.';
      return;
    }

    // TODO: replace with POST /api/auth/login once the backend is ready.
    const candidate = this.candidateStorage.findByCredentials(
      this.email,
      this.password
    );

    if (!candidate) {
      this.errorMessage = 'Invalid email or password.';
      return;
    }

    this.errorMessage = '';

    // Keep the password out of the session entry.
    this.loggedIn.emit({
      displayName: candidate.displayName,
      email: candidate.email
    });
  }
}

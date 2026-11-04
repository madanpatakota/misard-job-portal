import { Injectable } from '@angular/core';

export interface Candidate {
  displayName: string;
  email: string;
  password: string;
  registeredOn: string;
}

// What we keep for the logged-in session (no password).
export interface CandidateSession {
  displayName: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class CandidateStorageService {
  private candidatesStorageKey = 'misard-registered-candidates';

  getCandidates(): Candidate[] {
    try {
      return JSON.parse(
        localStorage.getItem(this.candidatesStorageKey) ?? '[]'
      );
    } catch {
      return [];
    }
  }

  isEmailRegistered(email: string) {
    const normalizedEmail = this.normalizeEmail(email);

    return this.getCandidates().some(
      candidate => candidate.email === normalizedEmail
    );
  }

  register(displayName: string, email: string, password: string): Candidate {
    const candidate: Candidate = {
      displayName: displayName.trim(),
      email: this.normalizeEmail(email),
      password,
      registeredOn: new Date().toISOString()
    };

    localStorage.setItem(
      this.candidatesStorageKey,
      JSON.stringify([...this.getCandidates(), candidate])
    );

    return candidate;
  }

  findByCredentials(email: string, password: string): Candidate | undefined {
    const normalizedEmail = this.normalizeEmail(email);

    return this.getCandidates().find(candidate =>
      candidate.email === normalizedEmail &&
      candidate.password === password
    );
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }
}

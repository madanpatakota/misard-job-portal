import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { CandidateSession } from './candidate-storage.service';
import { GoogleAuthService } from './google-auth.service';
import { Login } from './login/login';
import { Registration } from './registration/registration';

type JobStatus = 'all' | 'applied' | 'not-applied';

interface Job {
  id: number;
  companyName: string;
  applyUrl: string;
  isVisible: boolean;
}

@Component({
  selector: 'app-root',
  imports: [Login, Registration],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private http = inject(HttpClient);
  private googleAuth = inject(GoogleAuthService);

  private loginStorageKey = 'misard-logged-in-candidate';
  private appliedStorageKey = 'misard-applied-jobs';

  // Carried from registration to the login page.
  registeredEmail = signal('');
  registrationMessage = signal('');

  authView = signal<'login' | 'register'>('login');

  loggedInCandidate = signal<CandidateSession | null>(
    this.getLoggedInCandidate()
  );

  jobs = signal<Job[]>([]);

  selectedStatus = signal<JobStatus>('all');

  currentPage = signal(1);

pageSize = 10;

totalPages = computed(() => {
  return Math.max(
    1,
    Math.ceil(this.filteredJobs().length / this.pageSize)
  );
});

visibleJobs = computed(() => {
  const startIndex = (this.currentPage() - 1) * this.pageSize;

  return this.filteredJobs().slice(
    startIndex,
    startIndex + this.pageSize
  );
});

  /*
    Example data:

    {
      "1": "08 Sep 2026",
      "5": "09 Sep 2026"
    }
  */
  appliedJobs = signal<Record<number, string>>(
    this.getAppliedJobs()
  );

  searchTerm = signal('');

  filteredJobs = computed(() => {
    const status = this.selectedStatus();
    const appliedJobs = this.appliedJobs();
    const search = this.searchTerm().trim().toLowerCase();

    let jobs = this.jobs();

    if (status === 'applied') {
      jobs = jobs.filter(job => appliedJobs[job.id]);
    }

    if (status === 'not-applied') {
      jobs = jobs.filter(job => !appliedJobs[job.id]);
    }

    if (search) {
      jobs = jobs.filter(job =>
        job.companyName.toLowerCase().includes(search) ||
        job.id.toString() === search
      );
    }

    return jobs;
  });

  constructor() {
    this.http.get<Job[]>('assets/data/jobs.json')
      .subscribe({
        next: (data) => {
          this.jobs.set(data.filter(job => job.isVisible));
        },
        error: () => {
          console.log('Unable to load jobs.json');
        }
      });
  }

  // Used by both email/password login and Google sign-in.
  startSession(session: CandidateSession) {
    this.loggedInCandidate.set(session);

    localStorage.setItem(
      this.loginStorageKey,
      JSON.stringify(session)
    );

    this.registeredEmail.set('');
    this.registrationMessage.set('');
    this.authView.set('login');
  }

  logout() {
    localStorage.removeItem(this.loginStorageKey);
    this.googleAuth.signOut();

    this.loggedInCandidate.set(null);

    this.selectedStatus.set('all');
    this.searchTerm.set('');
  }

  showRegistration() {
    this.registrationMessage.set('');
    this.authView.set('register');
  }

  showLogin() {
    this.authView.set('login');
  }

  onRegistered(email: string) {
    this.registeredEmail.set(email);
    this.registrationMessage.set('Account created successfully. Please login.');
    this.authView.set('login');
  }

  goToPage(pageNumber: number) {
  if (pageNumber >= 1 && pageNumber <= this.totalPages()) {
    this.currentPage.set(pageNumber);
  }
}
pageNumbers() {
  const pagesToShow = 10;

  const startPage = Math.min(
    this.currentPage(),
    this.totalPages() - pagesToShow + 1
  );

  const safeStartPage = Math.max(1, startPage);

  const endPage = Math.min(
    safeStartPage + pagesToShow - 1,
    this.totalPages()
  );

  return Array.from(
    { length: endPage - safeStartPage + 1 },
    (_, index) => safeStartPage + index
  );
}

 changeStatus(status: JobStatus) {
  this.selectedStatus.set(status);

  // When changing All / Applied / Not Applied,
  // always start from page 1.
  this.currentPage.set(1);
}

  changeSearch(term: string) {
    this.searchTerm.set(term);

    // Show matching results from page 1.
    this.currentPage.set(1);
  }

  isApplied(jobId: number) {
    return !!this.appliedJobs()[jobId];
  }

  getAppliedDate(jobId: number) {
    return this.appliedJobs()[jobId];
  }

  toggleApplied(jobId: number) {
    const currentAppliedJobs = this.appliedJobs();

    const updatedAppliedJobs = { ...currentAppliedJobs };

    if (updatedAppliedJobs[jobId]) {
      delete updatedAppliedJobs[jobId];
    } else {
      updatedAppliedJobs[jobId] = new Date().toLocaleDateString(
        'en-IN',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }
      );
    }

    this.appliedJobs.set(updatedAppliedJobs);

    localStorage.setItem(
      this.appliedStorageKey,
      JSON.stringify(updatedAppliedJobs)
    );
  }

  applyForJob(job: Job) {
    if (!this.isApplied(job.id)) {
      this.toggleApplied(job.id);
    }

    window.open(job.applyUrl, '_blank');
  }

  private getLoggedInCandidate(): CandidateSession | null {
    try {
      return JSON.parse(
        localStorage.getItem(this.loginStorageKey) ?? 'null'
      );
    } catch {
      return null;
    }
  }

  private getAppliedJobs(): Record<number, string> {
    try {
      return JSON.parse(
        localStorage.getItem(this.appliedStorageKey) ?? '{}'
      );
    } catch {
      return {};
    }
  }
}
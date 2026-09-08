import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type JobStatus = 'all' | 'applied' | 'not-applied';

interface Job {
  id: number;
  companyName: string;
  applyUrl: string;
}

interface Candidate {
  email: string;
  password: string;
  displayName: string;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private http = inject(HttpClient);

  private loginStorageKey = 'misard-logged-in-candidate';
  private appliedStorageKey = 'misard-applied-jobs';

  candidates: Candidate[] = [
    {
      email: 'madan@gmail.com',
      password: 'Madan@123',
      displayName: 'Madan'
    },
    {
      email: 'student1@gmail.com',
      password: 'Student@123',
      displayName: 'Student One'
    },
    {
      email: 'student2@gmail.com',
      password: 'Student@123',
      displayName: 'Student Two'
    }
  ];

  loginEmail = '';
  loginPassword = '';
  loginError = '';

  loggedInCandidate = signal<Candidate | null>(
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

  filteredJobs = computed(() => {
    const status = this.selectedStatus();
    const appliedJobs = this.appliedJobs();

    if (status === 'applied') {
      return this.jobs().filter(job => appliedJobs[job.id]);
    }

    if (status === 'not-applied') {
      return this.jobs().filter(job => !appliedJobs[job.id]);
    }

    return this.jobs();
  });

  constructor() {
    this.http.get<Job[]>('assets/data/jobs.json')
      .subscribe({
        next: (data) => {
          this.jobs.set(data);
        },
        error: () => {
          console.log('Unable to load jobs.json');
        }
      });
  }

  login() {
    const candidate = this.candidates.find(item =>
      item.email === this.loginEmail.trim() &&
      item.password === this.loginPassword
    );

    if (!candidate) {
      this.loginError = 'Invalid email or password.';
      return;
    }

    this.loggedInCandidate.set(candidate);

    localStorage.setItem(
      this.loginStorageKey,
      JSON.stringify(candidate)
    );

    this.loginError = '';
    this.loginEmail = '';
    this.loginPassword = '';
  }

  logout() {
    localStorage.removeItem(this.loginStorageKey);

    this.loggedInCandidate.set(null);

    this.selectedStatus.set('all');
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

  private getLoggedInCandidate(): Candidate | null {
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
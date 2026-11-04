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
  companyType: 'MNC' | 'Non-MNC';
  companySize: 'Large' | 'Medium' | 'Small';
  employeeCount: string;
  industry: string;
  skills: string[];
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
  private pageSizeStorageKey = 'misard-page-size';

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

pageSizeOptions = [10, 25, 50, 100, 250, 500];

pageSize = signal(this.getPageSize());

totalPages = computed(() => {
  return Math.max(
    1,
    Math.ceil(this.filteredJobs().length / this.pageSize())
  );
});

visibleJobs = computed(() => {
  const startIndex = (this.currentPage() - 1) * this.pageSize();

  return this.filteredJobs().slice(
    startIndex,
    startIndex + this.pageSize()
  );
});

rangeStart = computed(() =>
  (this.currentPage() - 1) * this.pageSize() + 1
);

rangeEnd = computed(() =>
  Math.min(this.currentPage() * this.pageSize(), this.filteredJobs().length)
);

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

  // '' means no filter.
  selectedType = signal('');
  selectedSize = signal('');
  selectedIndustry = signal('');
  selectedSkill = signal('');

  industries = computed(() =>
    [...new Set(this.jobs().map(job => job.industry))].sort()
  );

  skills = computed(() =>
    [...new Set(this.jobs().flatMap(job => job.skills))].sort()
  );

  filteredJobs = computed(() => {
    const status = this.selectedStatus();
    const appliedJobs = this.appliedJobs();
    const search = this.searchTerm().trim().toLowerCase();
    const type = this.selectedType();
    const size = this.selectedSize();
    const industry = this.selectedIndustry();
    const skill = this.selectedSkill();

    let jobs = this.jobs();

    if (type) {
      jobs = jobs.filter(job => job.companyType === type);
    }

    if (size) {
      jobs = jobs.filter(job => job.companySize === size);
    }

    if (industry) {
      jobs = jobs.filter(job => job.industry === industry);
    }

    if (skill) {
      jobs = jobs.filter(job => job.skills.includes(skill));
    }

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
    this.clearFilters();
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

  changeFilter(filter: 'type' | 'size' | 'industry' | 'skill', value: string) {
    const filters = {
      type: this.selectedType,
      size: this.selectedSize,
      industry: this.selectedIndustry,
      skill: this.selectedSkill
    };

    filters[filter].set(value);
    this.currentPage.set(1);
  }

  changePageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);

    localStorage.setItem(this.pageSizeStorageKey, String(size));
  }

  hasFilters() {
    return !!(this.selectedType() || this.selectedSize() ||
      this.selectedIndustry() || this.selectedSkill());
  }

  clearFilters() {
    this.selectedType.set('');
    this.selectedSize.set('');
    this.selectedIndustry.set('');
    this.selectedSkill.set('');
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

  private getPageSize() {
    const size = Number(localStorage.getItem(this.pageSizeStorageKey));

    return this.pageSizeOptions.includes(size) ? size : 10;
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
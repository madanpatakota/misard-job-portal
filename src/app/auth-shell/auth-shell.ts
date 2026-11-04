import { Component } from '@angular/core';

// Two-column layout shared by the login and registration pages:
// brand panel on the left, the page's form projected on the right.
@Component({
  selector: 'app-auth-shell',
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.scss'
})
export class AuthShell {
  currentYear = new Date().getFullYear();

  features = [
    'Verified .NET Core, Angular and SQL openings',
    'Apply directly on official company career portals',
    'Track every job you have applied for'
  ];
}

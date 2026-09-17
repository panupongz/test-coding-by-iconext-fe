import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { API_BASE_URL } from './api-config.token';

describe('API_BASE_URL', () => {
  it('uses the environment API base URL', () => {
    expect(TestBed.inject(API_BASE_URL)).toBe(environment.apiBaseUrl);
  });

  it('targets the backend API v1 base path', () => {
    expect(TestBed.inject(API_BASE_URL)).toBe('/api/v1');
  });
});

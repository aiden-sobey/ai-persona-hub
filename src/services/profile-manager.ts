import * as fs from 'fs';
import * as path from 'path';
import { AIProfile } from '../types';

export class ProfileManager {
  private profilesDir: string;

  constructor(profilesDir: string = './profiles') {
    this.profilesDir = path.resolve(profilesDir);
    this.ensureProfilesDirectory();
  }

  private ensureProfilesDirectory(): void {
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
    }
  }

  private getProfilePath(profileName: string): string {
    return path.join(this.profilesDir, `${profileName}.json`);
  }

  private sanitizeProfileName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  }

  private validateProfile(data: any): data is AIProfile {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.id === 'string' &&
      typeof data.name === 'string' &&
      typeof data.systemPrompt === 'string' &&
      typeof data.createdAt === 'string' &&
      (data.maxTokens === undefined || typeof data.maxTokens === 'number') &&
      (data.lastUsed === undefined || typeof data.lastUsed === 'string')
    );
  }

  async createProfile(
    profile: Omit<AIProfile, 'id' | 'createdAt'>
  ): Promise<AIProfile> {
    const sanitizedName = this.sanitizeProfileName(profile.name);
    const newProfile: AIProfile = {
      ...profile,
      id: sanitizedName,
      createdAt: new Date().toISOString(),
    };

    const profilePath = this.getProfilePath(sanitizedName);

    if (fs.existsSync(profilePath)) {
      throw new Error(`Profile '${profile.name}' already exists`);
    }

    fs.writeFileSync(profilePath, JSON.stringify(newProfile, null, 2));

    return newProfile;
  }

  async getProfile(profileName: string): Promise<AIProfile | null> {
    const sanitizedName = this.sanitizeProfileName(profileName);
    const profilePath = this.getProfilePath(sanitizedName);

    if (!fs.existsSync(profilePath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(profilePath, 'utf-8');
      return JSON.parse(data);
    } catch (_error) {
      return null;
    }
  }

  async listProfiles(): Promise<AIProfile[]> {
    const profiles: AIProfile[] = [];

    try {
      if (!fs.existsSync(this.profilesDir)) {
        return profiles;
      }

      const files = fs.readdirSync(this.profilesDir);
      const jsonFiles = files.filter(
        file => file.endsWith('.json') && file !== 'index.json'
      );

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.profilesDir, file);
          const data = fs.readFileSync(filePath, 'utf-8');
          const profileData = JSON.parse(data);

          if (this.validateProfile(profileData)) {
            profiles.push(profileData);
          }
        } catch (_error) {
          // Skip invalid/corrupted profile files
          console.warn(
            `Warning: Could not load profile from ${file}:`,
            _error instanceof Error ? _error.message : 'Unknown error'
          );
        }
      }
    } catch (_error) {
      console.error(
        'Error scanning profiles directory:',
        _error instanceof Error ? _error.message : 'Unknown error'
      );
    }

    return profiles.sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateProfile(
    profileName: string,
    updates: Partial<AIProfile>
  ): Promise<AIProfile | null> {
    const profile = await this.getProfile(profileName);
    if (!profile) {
      return null;
    }

    const updatedProfile = { ...profile, ...updates };
    const profilePath = this.getProfilePath(profile.id);

    fs.writeFileSync(profilePath, JSON.stringify(updatedProfile, null, 2));
    return updatedProfile;
  }

  async deleteProfile(profileName: string): Promise<boolean> {
    const sanitizedName = this.sanitizeProfileName(profileName);
    const profilePath = this.getProfilePath(sanitizedName);

    if (!fs.existsSync(profilePath)) {
      return false;
    }

    fs.unlinkSync(profilePath);

    return true;
  }

  async updateLastUsed(profileName: string): Promise<void> {
    await this.updateProfile(profileName, {
      lastUsed: new Date().toISOString(),
    });
  }
}

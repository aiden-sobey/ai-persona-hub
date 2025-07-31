import * as fs from 'fs';
import * as path from 'path';
import { AIProfile, ProfileIndex } from '../types';

export class ProfileManager {
  private profilesDir: string;
  private indexPath: string;

  constructor(profilesDir: string = './profiles') {
    this.profilesDir = path.resolve(profilesDir);
    this.indexPath = path.join(this.profilesDir, 'index.json');
    this.ensureProfilesDirectory();
  }

  private ensureProfilesDirectory(): void {
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
    }
    if (!fs.existsSync(this.indexPath)) {
      this.writeIndex({ profiles: [] });
    }
  }

  private readIndex(): ProfileIndex {
    try {
      const data = fs.readFileSync(this.indexPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return { profiles: [] };
    }
  }

  private writeIndex(index: ProfileIndex): void {
    fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2));
  }

  private getProfilePath(profileName: string): string {
    return path.join(this.profilesDir, `${profileName}.json`);
  }

  private sanitizeProfileName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  }

  async createProfile(profile: Omit<AIProfile, 'id' | 'createdAt'>): Promise<AIProfile> {
    const sanitizedName = this.sanitizeProfileName(profile.name);
    const newProfile: AIProfile = {
      ...profile,
      id: sanitizedName,
      createdAt: new Date().toISOString()
    };

    const profilePath = this.getProfilePath(sanitizedName);
    
    if (fs.existsSync(profilePath)) {
      throw new Error(`Profile '${profile.name}' already exists`);
    }

    fs.writeFileSync(profilePath, JSON.stringify(newProfile, null, 2));

    const index = this.readIndex();
    index.profiles.push(sanitizedName);
    this.writeIndex(index);

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
    } catch (error) {
      return null;
    }
  }

  async listProfiles(): Promise<AIProfile[]> {
    const index = this.readIndex();
    const profiles: AIProfile[] = [];

    for (const profileName of index.profiles) {
      const profile = await this.getProfile(profileName);
      if (profile) {
        profiles.push(profile);
      }
    }

    return profiles.sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateProfile(profileName: string, updates: Partial<AIProfile>): Promise<AIProfile | null> {
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

    const index = this.readIndex();
    index.profiles = index.profiles.filter(p => p !== sanitizedName);
    this.writeIndex(index);

    return true;
  }

  async updateLastUsed(profileName: string): Promise<void> {
    await this.updateProfile(profileName, { lastUsed: new Date().toISOString() });
  }
}
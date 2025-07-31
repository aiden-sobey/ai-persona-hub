import * as fs from 'fs';
import * as path from 'path';
import {
  ChatHistory,
  ChatMessage,
  ConversationMetadata,
  SavedConversation,
} from '../types';

export class ChatHistoryManager {
  private profilesDir: string;

  constructor(profilesDir: string = './profiles') {
    this.profilesDir = path.resolve(profilesDir);
  }

  private getHistoryDir(profileId: string): string {
    return path.join(this.profilesDir, profileId, 'conversations');
  }

  private getHistoryFilePath(profileId: string): string {
    return path.join(this.getHistoryDir(profileId), 'history.json');
  }

  private ensureHistoryDirectory(profileId: string): void {
    const historyDir = this.getHistoryDir(profileId);
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
  }

  async loadChatHistory(profileId: string): Promise<ChatHistory> {
    const historyFilePath = this.getHistoryFilePath(profileId);

    if (!fs.existsSync(historyFilePath)) {
      return {
        profileId,
        userMessages: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    try {
      const data = fs.readFileSync(historyFilePath, 'utf-8');
      const history = JSON.parse(data) as ChatHistory;
      return history;
    } catch (error) {
      console.warn(
        `Warning: Could not load chat history for profile ${profileId}:`,
        error
      );
      return {
        profileId,
        userMessages: [],
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  async saveChatHistory(history: ChatHistory): Promise<void> {
    this.ensureHistoryDirectory(history.profileId);
    const historyFilePath = this.getHistoryFilePath(history.profileId);

    try {
      const updatedHistory = {
        ...history,
        lastUpdated: new Date().toISOString(),
      };
      fs.writeFileSync(
        historyFilePath,
        JSON.stringify(updatedHistory, null, 2)
      );
    } catch (error) {
      console.warn(
        `Warning: Could not save chat history for profile ${history.profileId}:`,
        error
      );
    }
  }

  async addUserMessage(profileId: string, message: string): Promise<void> {
    const history = await this.loadChatHistory(profileId);

    // Add the new message to the beginning of the array (most recent first)
    history.userMessages.unshift(message);

    // Keep only the last 100 messages to prevent unlimited growth
    if (history.userMessages.length > 100) {
      history.userMessages = history.userMessages.slice(0, 100);
    }

    await this.saveChatHistory(history);
  }

  async saveConversation(
    profileId: string,
    messages: ChatMessage[]
  ): Promise<void> {
    this.ensureHistoryDirectory(profileId);

    const conversationId = `conversation-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const metadata: ConversationMetadata = {
      id: conversationId,
      profileId,
      startedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      messageCount: messages.length,
    };

    const conversation: SavedConversation = {
      metadata,
      messages,
    };

    const conversationPath = path.join(
      this.getHistoryDir(profileId),
      `${conversationId}.json`
    );

    try {
      fs.writeFileSync(conversationPath, JSON.stringify(conversation, null, 2));
    } catch (error) {
      console.warn(
        `Warning: Could not save conversation for profile ${profileId}:`,
        error
      );
    }
  }

  async getRecentConversations(
    profileId: string,
    limit: number = 10
  ): Promise<SavedConversation[]> {
    const historyDir = this.getHistoryDir(profileId);

    if (!fs.existsSync(historyDir)) {
      return [];
    }

    try {
      const files = fs
        .readdirSync(historyDir)
        .filter(
          file => file.startsWith('conversation-') && file.endsWith('.json')
        )
        .sort()
        .reverse() // Most recent first
        .slice(0, limit);

      const conversations: SavedConversation[] = [];

      for (const file of files) {
        try {
          const filePath = path.join(historyDir, file);
          const data = fs.readFileSync(filePath, 'utf-8');
          const conversation = JSON.parse(data) as SavedConversation;
          conversations.push(conversation);
        } catch (error) {
          console.warn(
            `Warning: Could not load conversation from ${file}:`,
            error
          );
        }
      }

      return conversations;
    } catch (error) {
      console.warn(
        `Warning: Could not list conversations for profile ${profileId}:`,
        error
      );
      return [];
    }
  }
}

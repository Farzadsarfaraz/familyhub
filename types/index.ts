// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = 'PARENT' | 'CHILD' | 'GRANDPARENT' | 'GUEST';

export interface User {
  id:             string;
  email:          string;
  name:           string;
  avatar?:        string;
  role:           UserRole;
  familyId?:      string;
  isVerified:     boolean;
  pushToken?:     string;
  createdAt:      string;
  updatedAt:      string;
}

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
}

export interface AuthState {
  user:    User | null;
  tokens:  AuthTokens | null;
  isAuth:  boolean;
  loading: boolean;
}

// ─── Family ──────────────────────────────────────────────────────────────────

export interface Family {
  id:          string;
  name:        string;
  avatar?:     string;
  inviteCode:  string;
  members:     FamilyMember[];
  createdAt:   string;
}

export interface FamilyMember {
  userId:    string;
  user:      User;
  role:      UserRole;
  joinedAt:  string;
}

// ─── Calendar ────────────────────────────────────────────────────────────────

export type EventCategory = 'personal' | 'family' | 'birthday' | 'appointment' | 'school' | 'travel' | 'holiday';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CalendarEvent {
  id:          string;
  title:       string;
  description?: string;
  startDate:   string;
  endDate?:    string;
  allDay:      boolean;
  category:    EventCategory;
  color?:      string;
  location?:   string;
  attendees:   string[];   // user IDs
  recurrence:  RecurrenceType;
  reminders:   number[];   // minutes before
  familyId:    string;
  createdBy:   string;
  createdAt:   string;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus   = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface Task {
  id:          string;
  title:       string;
  description?: string;
  status:      TaskStatus;
  priority:    TaskPriority;
  assignedTo?: string;
  dueDate?:    string;
  recurring:   boolean;
  recurrence?: RecurrenceType;
  points:      number;
  familyId:    string;
  createdBy:   string;
  completedAt?: string;
  createdAt:   string;
}

// ─── Shopping ────────────────────────────────────────────────────────────────

export interface ShoppingList {
  id:       string;
  name:     string;
  familyId: string;
  items:    ShoppingItem[];
  createdBy: string;
  createdAt: string;
}

export interface ShoppingItem {
  id:        string;
  name:      string;
  quantity:  number;
  unit?:     string;
  category?: string;
  checked:   boolean;
  addedBy:   string;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'video' | 'voice' | 'file';

export interface Message {
  id:        string;
  content:   string;
  type:      MessageType;
  mediaUrl?: string;
  senderId:  string;
  sender:    User;
  roomId:    string;
  reactions: MessageReaction[];
  readBy:    string[];
  replyTo?:  string;
  createdAt: string;
}

export interface MessageReaction {
  emoji:  string;
  userId: string;
}

export interface ChatRoom {
  id:          string;
  name:        string;
  familyId:    string;
  members:     string[];
  lastMessage?: Message;
  unreadCount: number;
}

// ─── Memories ────────────────────────────────────────────────────────────────

export type MediaType = 'photo' | 'video';

export interface Memory {
  id:          string;
  title?:      string;
  description?: string;
  mediaUrl:    string;
  thumbnailUrl?: string;
  mediaType:   MediaType;
  albumId?:    string;
  taggedUsers: string[];
  likes:       string[];
  comments:    MemoryComment[];
  familyId:    string;
  uploadedBy:  string;
  takenAt?:    string;
  createdAt:   string;
}

export interface MemoryComment {
  id:        string;
  content:   string;
  userId:    string;
  user:      User;
  createdAt: string;
}

export interface Album {
  id:         string;
  name:       string;
  coverUrl?:  string;
  familyId:   string;
  memories:   Memory[];
  createdAt:  string;
}

// ─── Finance ─────────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense';
export type FinanceCategory = 'food' | 'transport' | 'health' | 'education' | 'entertainment' | 'utilities' | 'clothing' | 'other';

export interface Transaction {
  id:          string;
  title:       string;
  amount:      number;
  type:        TransactionType;
  category:    FinanceCategory;
  date:        string;
  note?:       string;
  familyId:    string;
  createdBy:   string;
  createdAt:   string;
}

export interface Budget {
  id:         string;
  category:   FinanceCategory;
  limit:      number;
  spent:      number;
  month:      string;
  familyId:   string;
}

export interface SavingsGoal {
  id:          string;
  name:        string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string;
  familyId:    string;
  createdBy:   string;
  createdAt:   string;
}

// ─── Health ──────────────────────────────────────────────────────────────────

export interface MedicationReminder {
  id:        string;
  name:      string;
  dosage:    string;
  frequency: string;
  times:     string[];
  userId:    string;
  familyId:  string;
  active:    boolean;
}

export interface HealthAppointment {
  id:          string;
  title:       string;
  doctor?:     string;
  location?:   string;
  date:        string;
  userId:      string;
  familyId:    string;
  notes?:      string;
  createdAt:   string;
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export type GoalType    = 'family' | 'personal';
export type GoalStatus  = 'active' | 'completed' | 'paused';

export interface Goal {
  id:           string;
  title:        string;
  description?: string;
  type:         GoalType;
  status:       GoalStatus;
  progress:     number;  // 0-100
  targetDate?:  string;
  milestones:   Milestone[];
  assignedTo?:  string;
  familyId:     string;
  createdBy:    string;
  createdAt:    string;
}

export interface Milestone {
  id:          string;
  title:       string;
  completed:   boolean;
  completedAt?: string;
}

// ─── Travel ──────────────────────────────────────────────────────────────────

export interface Trip {
  id:          string;
  name:        string;
  destination: string;
  startDate:   string;
  endDate:     string;
  budget?:     number;
  coverImage?: string;
  itinerary:   ItineraryItem[];
  packingList: PackingItem[];
  familyId:    string;
  createdBy:   string;
  createdAt:   string;
}

export interface ItineraryItem {
  id:       string;
  day:      number;
  time?:    string;
  activity: string;
  location?: string;
  notes?:   string;
}

export interface PackingItem {
  id:      string;
  name:    string;
  packed:  boolean;
  qty:     number;
}

// ─── Pets ────────────────────────────────────────────────────────────────────

export interface Pet {
  id:        string;
  name:      string;
  species:   string;
  breed?:    string;
  birthDate?: string;
  avatar?:   string;
  familyId:  string;
  createdAt: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType = 'event' | 'task' | 'chat' | 'birthday' | 'reminder' | 'family' | 'ai';

export interface AppNotification {
  id:         string;
  type:       NotificationType;
  title:      string;
  body:       string;
  data?:      Record<string, string>;
  read:       boolean;
  userId:     string;
  createdAt:  string;
}

// ─── Meals ───────────────────────────────────────────────────────────────────

export interface Recipe {
  id:           string;
  name:         string;
  description?: string;
  imageUrl?:    string;
  ingredients:  string[];
  instructions: string[];
  prepTime:     number;
  cookTime:     number;
  servings:     number;
  calories?:    number;
  category:     string;
  familyId:     string;
  createdBy:    string;
  createdAt:    string;
}

export interface MealPlan {
  id:       string;
  weekOf:   string;
  days:     DayMeal[];
  familyId: string;
}

export interface DayMeal {
  date:      string;
  breakfast?: string;
  lunch?:    string;
  dinner?:   string;
  snacks:    string[];
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data:    T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message:    string;
  error?:     string;
}

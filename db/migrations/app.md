Cadillac's Goods Driver App: Development Plan
Executive Summary
A dedicated Expo mobile application for Cadillac's Goods delivery drivers that integrates with the existing web platform and provides real-time order management, route optimization, and delivery tools.

Core Requirements
Authentication & Security
Driver-specific login using existing Clerk authentication
Secure access control based on driver role
Session management optimized for mobile devices
Location & Mapping
Real-time driver location dtracking
Turn-by-turn navigation to delivery destinations
Route optimization for multiple deliveries
Geocoding for address verification
Order Management
View assigned orders with detailed information
Order status updates (ASSIGNED → ENROUTE → DELIVERED)
Delivery confirmation with photo/signature capture
Order history and metrics
Route Management
View daily delivery routes
Route progress tracking
ETA calculations and updates
Ability to reorder stops for efficiency
Driver Status Management
Toggle between statuses (active, on-delivery, off-duty, on-break)
Status history logging
Automatic status transitions based on activity
Communication
In-app messaging with customers
Push notifications for new orders
Alert system for urgent updates
Delivery instructions access
Offline Functionality
Cached order data for offline access
Queued status updates when offline
Automatic sync when connectivity resumes
Offline maps for navigation
Driver Profile
Vehicle information management
Personal details and preferences
Performance metrics and history
Technical Integration Points
Supabase Integration
Real-time database synchronization
Driver profile data access
Order and route data management
Mapbox/Navigation Integration
Route rendering and optimization
Address geocoding and validation
Turn-by-turn navigation integration
Clerk Authentication
Role-based access control
Profile management

Database Schema

Driver-Related Tables

driver_profiles
- id (string, primary key): Unique identifier
- clerk_user_id (string): Reference to Clerk authentication system
- driver_status (enum): 'active', 'on-delivery', 'off-duty', 'on-break'
- current_location (JSON): 
  - latitude (number)
  - longitude (number)
  - last_updated (timestamp)
- vehicle_details (JSON):
  - make (string)
  - model (string)
  - year (number)
  - color (string)
  - license_plate (string)
  - type (enum): 'car', 'motorcycle', 'bicycle', 'other'
- license_number (string): Driver's license information
- driver_image_url (string): Profile image
- created_at (timestamp)
- updated_at (timestamp)

Order-Related Tables

orders
- id (number, primary key): Unique identifier
- customer_id (string, foreign key): References customers table
- driver_id (string, foreign key): References driver_profiles table
- snapchat_username_at_order (string): Customer's Snapchat username at time of order
- address (string): Delivery address
- total_price (number): Total order price
- total_paid (number): Amount paid
- status (enum): 'PENDING', 'ASSIGNED', 'ENROUTE', 'DELIVERED', 'CANCELLED'
- payment_status (enum): 'PENDING', 'PARTIAL', 'PAID', 'REFUNDED'
- notes (string): Order notes
- created_at (timestamp)
- updated_at (timestamp)
- tags (array): Order tags

order_items
- id (string, primary key)
- order_id (number, foreign key): References orders table
- product_id (string, foreign key): References products table
- quantity (number)
- price_at_time (number): Price at time of order

Route-Related Tables

routes
- id (string, primary key)
- name (string): Route name or identifier
- driver_id (string, foreign key): References driver_profiles table
- status (enum): 'scheduled', 'in-progress', 'completed', 'delayed'
- start_location (JSON): Starting coordinates
- start_address (string): Starting address
- estimated_completion_time (timestamp)
- actual_start_time (timestamp)
- actual_completion_time (timestamp)
- total_distance (number): Total route distance
- notes (string): Route notes
- created_at (timestamp)
- updated_at (timestamp)

route_orders
- id (string, primary key)
- route_id (string, foreign key): References routes table
- order_id (number, foreign key): References orders table
- stop_number (number): Order of stops in route
- status (enum): 'pending', 'completed', 'skipped'
- estimated_arrival_time (timestamp)
- actual_arrival_time (timestamp)
- created_at (timestamp)
- updated_at (timestamp)

Customer-Related Tables

customers
- id (string, primary key)
- snapchat_username (string)
- phone_number (string)
- email (string)
- notes (string)
- telegram_username (string)
- instagram_username (string)
- created_at (timestamp)
- updated_at (timestamp)

customer_notes
- id (string, primary key)
- customer_id (string, foreign key): References customers table
- content (string): Note content
- author (string): Note author
- created_at (timestamp)

Mobile App Data Flow

1. **Authentication Flow**:
   - Clerk authentication → JWT token → Supabase RLS policies

2. **Driver Data Sync**:
   - Pull driver profile on login
   - Subscribe to real-time updates
   - Push status changes immediately

3. **Order Assignment Flow**:
   - Push notification → Order added to driver queue
   - Driver accepts → Status update → Route calculation

4. **Delivery Flow**:
   - Navigation to customer → Status update to ENROUTE
   - Arrival → Delivery confirmation → Status update to DELIVERED
   - Photo/signature capture → Upload to storage bucket

5. **Route Optimization**:
   - Background calculation of optimal route
   - Real-time updates based on traffic and new orders
   - Status updates trigger route recalculation
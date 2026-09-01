# FasilLink Frontend - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager
- Backend API running on http://localhost:5000

### Installation

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm start
```

The application will open at `http://localhost:3000`

---

## 📝 Environment Configuration

Create `.env.local` file in the frontend root:

```
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

---

## 🎯 Key Pages

### Homepage
```
http://localhost:3000/
```
- Full marketplace homepage
- All category cards
- Trending items
- Recommended items
- Recently added items

### Search
```
http://localhost:3000/search?q=car
```
- Search results for "car"
- Filters on left sidebar
- Grid layout
- Sortable results

### Item Details
```
http://localhost:3000/item/item-1
```
- Item details page
- Image gallery
- Owner information
- Similar items
- Reviews section

### Categories
```
http://localhost:3000/category/1
```
- All items in category "Homes"
- Category statistics
- Category-specific items

### Favorites
```
http://localhost:3000/favorites
```
- User's saved items (requires login)
- Remove favorites
- View favorites

### Chats
```
http://localhost:3000/chats
```
- Messaging interface
- Chat list
- Message history
- (Requires login)

### Notifications
```
http://localhost:3000/notifications
```
- Notification center
- Unread notifications
- Notification filtering
- (Requires login)

---

## 🔑 Testing Features

### Without Backend
The app will work with default/sample data:
- Default categories (Homes, Vehicles, Event Materials)
- Sample item cards
- Simulated search results
- Floating AI assistant

### With Backend
For full functionality, ensure backend endpoints are implemented:

**Required endpoints:**
```
GET  /api/categories
GET  /api/categories/:id
GET  /api/items/:id
GET  /api/items/trending
GET  /api/items/recommended
GET  /api/items/recent
GET  /api/search
GET  /api/favorites
POST /api/favorites/:itemId
GET  /api/chats
GET  /api/notifications
```

See `API_CONFIGURATION.md` for full details.

---

## 🧪 Testing Scenarios

### 1. Homepage
```
✓ All sections load
✓ Categories display
✓ Trending items show
✓ Recommended items show
✓ Hero search works
✓ Navigation links work
```

### 2. Search
```
✓ Search query works
✓ Filters update results
✓ Sorting works
✓ Price range filter works
```

### 3. Item Details
```
✓ Image gallery works
✓ Tab switching works
✓ Favorite toggle works
✓ Similar items show
```

### 4. Navigation
```
✓ Navbar sticky
✓ Categories dynamic
✓ Search bar autocomplete
✓ User dropdown
```

---

## 🎨 Customizing Colors

Edit `tailwind.config.js`:

```javascript
colors: {
  primary: {
    700: '#6C3BFF', // Change this
  }
}
```

Then restart the dev server.

---

## 📦 Build for Production

```bash
npm run build
```

This creates optimized build in `build/` folder.

Deploy to:
- Vercel: `vercel deploy`
- Netlify: `netlify deploy --prod --dir=build`
- AWS S3: Use AWS CLI to upload `build/` folder

---

## 🐛 Troubleshooting

### API endpoints not responding
```
✓ Check backend is running
✓ Check API_BASE_URL in .env.local
✓ Check CORS settings on backend
✓ Check browser console for errors
```

### Categories not loading
```
✓ Check /api/categories endpoint
✓ Check browser console
✓ Verify localStorage is enabled
✓ Check backend response format
```

### Images not loading
```
✓ Check image URLs are correct
✓ Check CORS on image server
✓ Check uploads folder is served
✓ Check file permissions
```

### Styles not applying
```
✓ npm install (reinstall deps)
✓ npm start (restart server)
✓ Clear browser cache (Ctrl+Shift+Delete)
✓ Check tailwind.config.js
```

---

## 📊 Performance Tips

- **Enable caching**: Store categories in localStorage
- **Lazy load images**: Use image CDN with lazy loading
- **Code splitting**: Routes auto-split with React Router
- **Monitor bundle**: Run `npm run build` and check size

---

## 🔒 Security Notes

- Never commit `.env` files
- API tokens stored in localStorage (can be moved to secure storage)
- CORS should be configured on backend
- Input validation on backend required

---

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Desktop browsers only** (no mobile optimization)

---

## 🤝 Component Usage Examples

### Button
```jsx
<Button variant="primary" size="md">
  Click Me
</Button>
```

### Search Bar
```jsx
<AISearchBar
  onSearch={(query) => navigate(`/search?q=${query}`)}
  placeholder="Search..."
/>
```

### Item Card
```jsx
<ItemCard
  id="item-1"
  title="2-Bedroom Home"
  price={25000}
  image="https://..."
  location="Gondar"
  onFavoriteToggle={handleFavorite}
/>
```

---

## 📚 Documentation Files

- **DESKTOP_UI_README.md** - Architecture & features
- **API_CONFIGURATION.md** - Backend integration guide
- **BUILD_SUMMARY.md** - What was built

---

## 💻 Development Workflow

1. **Start server**: `npm start`
2. **Make changes**: Edit files in `src/`
3. **Hot reload**: Changes auto-refresh
4. **Test in browser**: Navigate to http://localhost:3000
5. **Check console**: browser DevTools for errors
6. **Build**: `npm run build` when ready

---

## 🎓 Learning Resources

- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)
- [Lucide Icons](https://lucide.dev)

---

## ✨ Next Features to Build

1. **Login/Registration Pages**
   - Form validation
   - Password strength meter
   - Email verification

2. **User Dashboard**
   - Profile management
   - Order history
   - Settings

3. **Admin Panel**
   - Category management
   - Item moderation
   - User management
   - Analytics

4. **Payment Integration**
   - Stripe/PayPal
   - Order checkout
   - Payment history

5. **Review System**
   - User reviews
   - Rating display
   - Review moderation

---

## 📞 Support

For issues, check:
1. Browser console (F12)
2. Terminal/console output
3. Documentation files
4. Backend logs

---

## 🎉 You're Ready!

```bash
npm start
```

**Your FasilLink marketplace is now running!** 🚀

Visit `http://localhost:3000` to see the beautiful desktop UI.

---

**Version**: 1.0.0  
**Last Updated**: May 2024  
**Status**: ✅ Ready to Use

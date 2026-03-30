// Check if there's any cached data in browser storage that we can recover
console.log('🔍 CHECKING BROWSER STORAGE FOR CACHED DATA...')

// Check localStorage
console.log('\n📦 LOCAL STORAGE:')
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i)
  if (key && (key.includes('grade') || key.includes('niche') || key.includes('trainee') || key.includes('supabase'))) {
    console.log(`${key}:`, localStorage.getItem(key))
  }
}

// Check sessionStorage
console.log('\n📦 SESSION STORAGE:')
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i)
  if (key && (key.includes('grade') || key.includes('niche') || key.includes('trainee') || key.includes('supabase'))) {
    console.log(`${key}:`, sessionStorage.getItem(key))
  }
}

// Check if there are any cached network responses
console.log('\n🌐 CHECKING NETWORK CACHE...')
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    console.log('Available caches:', cacheNames)
    cacheNames.forEach(cacheName => {
      if (cacheName.includes('supabase') || cacheName.includes('niche')) {
        caches.open(cacheName).then(cache => {
          cache.keys().then(requests => {
            console.log(`Cache ${cacheName}:`, requests.map(req => req.url))
          })
        })
      }
    })
  })
}

console.log('\n💡 RECOVERY SUGGESTIONS:')
console.log('1. Check browser DevTools > Application > Storage for any cached data')
console.log('2. Look for any screenshots of the grading interface')
console.log('3. Check if you have any exported/downloaded certificates')
console.log('4. Review browser history for any URLs with grade data')
console.log('5. Check if anyone else has access to the system with the data')
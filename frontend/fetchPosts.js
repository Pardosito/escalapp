async function fetchPosts() {
    try {
        const response = await fetch('/posts');
        if (!response.ok) { // Basic error handling for the HTTP response
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const posts = await response.json();

        const feedContainer = document.querySelector('.space-y-6');
        feedContainer.innerHTML = '';

        if (!Array.isArray(posts)) {
            console.error('Expected an array of posts, but received:', posts);
            feedContainer.innerHTML = '<p>Error: Could not load posts.</p>';
            return;
        }

        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.classList.add('bg-white', 'rounded-lg', 'shadow-md');
            postElement.innerHTML = `
                <div class="p-4">
                    <div class="flex items-center mb-4">
                        <img src="${post.profilePic || 'default_profile.png'}" alt="${post.username || 'User'}" class="w-10 h-10 rounded-full mr-3">
                        <div>
                            <h3 class="font-semibold">${post.username || 'Unknown User'}</h3>
                            <p class="text-gray-500 text-sm">${post.createdAt || 'Just now'}</p> 
                        </div>
                    </div>
                    <p class="mb-4">${post.content || ''}</p>
                    <img src="${post.imageUrl || 'default_post_image.jpg'}" alt="Post Image" class="w-full rounded-lg mb-4">
                    <div class="flex justify-between text-gray-600">
                        <div>Difficulty: ${post.difficulty || 'N/A'} | ${post.climbType || 'Unknown'}</div>
                        <div>
                            <span>❤️ ${post.likes || 0}</span>
                            <span class="ml-3">💬 ${post.commentCount || 0}</span>
                        </div>
                    </div>
                </div>
            `;
            feedContainer.appendChild(postElement);
        });

    } catch (error) {
        console.error('Error fetching or processing posts:', error);
        // Display a user-friendly error message on the page
        feedContainer.innerHTML = '<p>Sorry, we could not load the feed right now. Please try again later.</p>';
    }
}

window.addEventListener('load', fetchPosts);
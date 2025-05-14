// This code goes into your script.js file

// Get a reference to the main content area
const mainDiv = document.getElementById("mainDiv");
// You might need references to other dynamic areas like profileFeed or userFeed as well
// const profileFeed = document.getElementById("profileFeed"); // Ensure these elements exist in your base HTML or are handled appropriately by switchViews


// --- Main function to switch between views ---
async function switchViews(view) {
    if (!mainDiv) {
        console.error("#mainDiv not found in the base HTML.");
        return; // Cannot switch views if main container is missing
    }

    // Optional: Show a loading indicator
    mainDiv.innerHTML = '<p class="text-center text-gray-500">Loading...</p>';


    let htmlFileName = "";
    let targetElementId = "";
    let initializationFunction = null; // Function to call after injecting HTML

    switch (view) {
        case "challenges":
            htmlFileName = "challenges.html";
            targetElementId = "challengesBody";
            // initializationFunction = initializeChallengesView; // Create this function if needed
            break;
        case "communities":
            htmlFileName = "communities.html";
            targetElementId = "communitiesBody";
            // initializationFunction = initializeCommunitiesView; // Create this function if needed
            break;
        case "profile":
            htmlFileName = "profile.html";
            targetElementId = "profileBody";
             // NOTE: Profile might have sub-views ('ascents', 'saved', 'userPosts', 'userRoutes')
             // You'll need to manage how these sub-views interact or load within the profile body.
             // The 'ascents', 'saved', 'userPosts', 'userRoutes' cases below seem to target profileFeed/userFeed directly,
             // which might conflict if profile.html injects profileBody containing those IDs.
             // Re-evaluate your HTML structure and how sub-views load.
            // initializationFunction = initializeProfileView; // Create this function if needed
            break;
        case "routes":
            htmlFileName = "routes.html";
            targetElementId = "routesBody";
            // initializationFunction = initializeRoutesView; // Create this function if needed
            break;
        case "settings":
            htmlFileName = "settings.html";
            targetElementId = "settingsBody";
            initializationFunction = initializeSettingsView; // Call the settings-specific JS init
            break;
        case "home":
            htmlFileName = "index.html"; // Use index.html for the home view content
            targetElementId = "homeBody"; // The ID within index.html that contains the feed/post creation form
            initializationFunction = initializeHomeView; // Call the home-specific JS init
            break;
        case "explore":
             htmlFileName = "explore.html";
             targetElementId = "exploreFeed";
            // initializationFunction = initializeExploreView; // Create this function if needed
            break;
        // Cases for sub-views that target specific areas (like profileFeed, userFeed)
        // These might need different handling if the parent view isn't already loaded
        case "ascents":
            // Assuming profile is already loaded, target profileFeed or userFeed
             // You might need to adjust the target element based on your HTML structure
             await fetchAndInjectPartial("ascents.html", "ascentsBody", document.getElementById("profileFeed") || document.getElementById("userFeed"), initializeAscentsView);
             return; // Exit switchViews after handling
        case "saved":
             await fetchAndInjectPartial("savedRoutes.html", "savedRoutesBody", document.getElementById("profileFeed") || document.getElementById("userFeed"), initializeSavedRoutesView);
             return;
         case "userPosts":
             await fetchAndInjectPartial("userPosts.html", "userPosts", document.getElementById("userFeed") || document.getElementById("profileFeed"), initializeUserPostsView);
             return;
        case "userRoutes":
             await fetchAndInjectPartial("userRoutes.html", "userRoutes", document.getElementById("userFeed") || document.getElementById("profileFeed"), initializeUserRoutesView);
             return;
        case "singleRoute":
            htmlFileName = "singleRoute.html";
            targetElementId = "singleRouteBody";
            // initializationFunction = initializeSingleRouteView; // Create this function if needed
            break;
        case "post": // Assuming this is for posting a new route/climb, not social post
            htmlFileName = "postRoute.html"; // Or 'createPost.html' ?
            targetElementId = "postBody";
            // initializationFunction = initializePostRouteView; // Create this function if needed
            break;
        case "singleCom":
            htmlFileName = "singleCommunity.html";
            targetElementId = "singleCommunityBody";
            // initializationFunction = initializeSingleCommunityView; // Create this function if needed
            break;


        default:
             mainDiv.innerHTML = '<p class="text-center text-red-500">View not found.</p>';
            console.error("Unknown view:", view);
            return; // Exit if view is unknown
    }

    // Fetch the HTML file
    await fetch(htmlFileName)
        .then(response => {
             if (!response.ok) {
                 throw new Error(`HTTP error! status: ${response.status} from ${htmlFileName}`);
             }
             return response.text();
        })
        .then(data => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, "text/html");
            const targetElement = doc.getElementById(targetElementId);

            if (targetElement) {
                mainDiv.innerHTML = targetElement.innerHTML; // Inject the content

                // --- Call the initialization function AFTER injecting HTML ---
                if (initializationFunction) {
                    initializationFunction(); // Execute view-specific JS setup
                }
                // -------------------------------------------------------

            } else {
                console.error(`${targetElementId} not found in fetched ${htmlFileName}`);
                 mainDiv.innerHTML = `<p class="text-center text-red-500">Error loading content for ${view}.</p>`;
            }
        })
        .catch(error => {
            console.error(`Error fetching or processing ${htmlFileName}:`, error);
             mainDiv.innerHTML = `<p class="text-center text-red-500">Error loading ${view} view.</p>`;
        });
}

// --- Helper function for injecting into targets other than mainDiv ---
// (Used by 'ascents', 'saved', etc. cases if they target specific areas)
async function fetchAndInjectPartial(htmlFileName, targetElementId, targetContainer, initializationFunction = null) {
     if (!targetContainer) {
         console.error(`Target container not found for ${htmlFileName}`);
         return;
     }
     targetContainer.innerHTML = '<p class="text-center text-gray-500">Loading...</p>'; // Optional loading state

     try {
         const response = await fetch(htmlFileName);
         if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status} from ${htmlFileName}`);
         }
         const data = await response.text();
         const parser = new DOMParser();
         const doc = parser.parseFromString(data, "text/html");
         const targetElement = doc.getElementById(targetElementId);

         if (targetElement) {
             targetContainer.innerHTML = targetElement.innerHTML; // Inject content

             if (initializationFunction) {
                 initializationFunction(); // Execute view-specific JS setup
             }
         } else {
             console.error(`${targetElementId} not found in fetched ${htmlFileName}`);
             targetContainer.innerHTML = `<p class="text-center text-red-500">Error loading content.</p>`;
         }
     } catch (error) {
         console.error(`Error fetching or processing ${htmlFileName}:`, error);
         targetContainer.innerHTML = `<p class="text-center text-red-500">Error loading content.</p>`;
     }
}


// --- Initialization Function for the Home View ---
function initializeHomeView() {
    console.log("Initializing Home View...");
    // Get references to elements *within the newly injected HTML*
    const postsContainer = document.querySelector('#homeBody .space-y-6'); // Select the div that holds the posts
    const postTextarea = document.querySelector('#homeBody .bg-white.rounded-lg.shadow-md textarea'); // Select the textarea
    const postButton = document.querySelector('#homeBody .bg-white.rounded-lg.shadow-md button.bg-blue-500'); // Select the post button

    // --- Function to Fetch Posts (Same as before) ---
    const fetchPosts = async () => {
        if (!postsContainer) {
             console.error("Posts container not found in Home View!");
             return;
         }
        postsContainer.innerHTML = '<p class="text-center text-gray-500">Loading posts...</p>'; // Loading state

        try {
            // !!! IMPORTANT !!! Update this URL to match your backend GET posts endpoint
            const backendPostsUrl = 'http://localhost:3000/api/posts'; // Example URL


            const response = await fetch(backendPostsUrl, {
                method: 'GET',
                 headers: { 'Content-Type': 'application/json' }, // Good practice
                credentials: true // Crucial for sending authentication cookies
            });

            if (response.ok) {
                const posts = await response.json();
                console.log('Fetched posts:', posts);
                renderPosts(posts); // Call the function to display the posts
            } else if (response.status === 401) {
                console.error('Authentication failed in Home View. Redirecting to login.');
                alert('Session expired or not logged in. Please log in again.');
                window.location.href = 'login.html';
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                 console.error('Failed to fetch posts in Home View:', response.status, errorData);
                 postsContainer.innerHTML = `<p class="text-red-500">Error loading posts: ${errorData.message || 'Could not fetch posts.'}</p>`;
            }

        } catch (error) {
            console.error('Network error fetching posts in Home View:', error);
             postsContainer.innerHTML = `<p class="text-red-500">Network error loading posts. Please try again.</p>`;
        }
    };

     // --- Function to Render Posts (Same as before, ensure selectors are correct) ---
    const renderPosts = (posts) => {
         if (!postsContainer) {
             console.error("Posts container not found for rendering in Home View!");
             return;
         }
        postsContainer.innerHTML = ''; // Clear loading/existing content

        if (!posts || posts.length === 0) {
            postsContainer.innerHTML = '<p class="text-gray-500 text-center">No posts yet. Be the first to share!</p>';
            return;
        }

        posts.forEach(post => {
             // Use same dynamic HTML creation logic as before
             const postElement = document.createElement('div');
             postElement.classList.add('bg-white', 'rounded-lg', 'shadow-md');
             postElement.innerHTML = `
                 <div class="p-4">
                     <div class="flex items-center mb-4">
                         <img
                             src="${post.user?.avatarUrl || 'https://via.placeholder.com/40'}"
                             alt="${post.user?.username || 'Unknown User'}'s avatar"
                             class="w-10 h-10 rounded-full mr-3"
                         >
                         <div>
                             <h3 class="font-semibold">${post.user?.username || 'Unknown User'}</h3>
                             <p class="text-gray-500 text-sm">${new Date(post.createdAt).toLocaleString()}</p>
                         </div>
                     </div>
                     <p class="mb-4">${post.content}</p>
                     ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="w-full rounded-lg mb-4">` : ''}
                     <div class="flex justify-between text-gray-600">
                         <div>${post.location ? `📍 ${post.location}` : ''}</div>
                         <div>
                             <span>❤️ ${post.likesCount || 0}</span>
                             <span class="ml-3">💬 ${post.commentsCount || 0}</span>
                         </div>
                     </div>
                 </div>
             `;
            postsContainer.appendChild(postElement);
        });
    };


    // --- Function to Create a New Post (Same as before) ---
    const createPost = async () => {
         if (!postTextarea || !postButton) {
             console.error("Post creation elements not found in Home View!");
             return;
         }

         const content = postTextarea.value.trim();

         if (content === '') {
             alert('Post content cannot be empty.');
             return;
         }

         postButton.disabled = true;
         const originalButtonText = postButton.textContent;
         postButton.textContent = 'Posting...';

         try {
             // !!! IMPORTANT !!! Update this URL to match your backend POST create post endpoint
             const backendCreatePostUrl = 'http://localhost:3000/api/posts'; // Example URL

             const response = await fetch(backendCreatePostUrl, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ content: content }),
                 credentials: true
             });

             if (response.ok) {
                 console.log('Post created successfully.');
                 postTextarea.value = ''; // Clear textarea
                 fetchPosts(); // Refresh feed
             } else if (response.status === 401) {
                 console.error('Authentication failed while creating post in Home View. Redirecting to login.');
                 alert('Session expired or not logged in. Please log in again.');
                 window.location.href = 'login.html';
             } else {
                  const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                 console.error('Failed to create post in Home View:', response.status, errorData);
                 alert(errorData.message || 'Failed to create post.');
             }

         } catch (error) {
             console.error('Network error creating post in Home View:', error);
             alert('Network error. Could not create post.');
         } finally {
             postButton.disabled = false;
             postButton.textContent = originalButtonText;
         }
    };


    // --- Add Event Listener to Post Button AFTER HTML IS INJECTED ---
    if (postButton) {
        postButton.addEventListener('click', createPost);
    } else {
        console.error("Post button element not found in Home View!");
    }

    // --- Initial Fetch for Home View ---
    fetchPosts(); // Fetch posts when the home view is initialized

}


// --- Initialization Function for the Settings View ---
// This function contains the logic for the logout button specifically
function initializeSettingsView() {
    console.log("Initializing Settings View...");
    // Get a reference to the logout button *within the newly injected HTML*
    const logoutButton = document.getElementById('logoutButton');

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            console.log("Logout button clicked.");
            try {
                // Replace with your backend URL
                const backendLogoutUrl = 'http://localhost:3000/login/logout'; // Corrected URL

                const response = await fetch(backendLogoutUrl, {
                    method: 'POST',
                    credentials: "include" // Send cookies
                });

                if (response.ok) {
                    console.log('Logout successful on the server.');
                    window.location.href = 'login.html'; // Redirect to login page
                } else {
                    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                    console.error('Logout failed on the server:', response.status, errorData);
                    alert(errorData.message || 'Logout failed.');
                }

            } catch (error) {
                console.error('Network error during logout:', error);
                alert('Could not connect to the server to log out.');
            }
        });
    } else {
        console.error("Logout button not found in Settings View!");
    }
}


// --- Keep your other functions ---
function switchTab(tabValue) {
    // Logic to switch tabs within a view (like settings)
    document.querySelectorAll('[data-tab-content]').forEach(content => {
    content.classList.add('hidden');
    });

    document.querySelectorAll('[data-tab-trigger]').forEach(trigger => {
    trigger.classList.remove('bg-blue-500', 'text-white'); // Assuming blue is the active color
    // Add logic to set the active color correctly if it's not just blue/white toggle
    const activeTrigger = document.querySelector(`[data-tab-trigger="${tabValue}"]`);
     if (activeTrigger) {
         activeTrigger.classList.add('bg-blue-500', 'text-white');
     }

    });

    const targetContent = document.querySelector(`[data-tab-content="${tabValue}"]`);
    if (targetContent) {
        targetContent.classList.remove('hidden');
    } else {
        console.error(`Tab content for "${tabValue}" not found.`);
    }
}


function toggleDeleteDialog() {
const dialog = document.getElementById('delete-dialog');
 if (dialog) {
    dialog.classList.toggle('hidden');
 } else {
    console.error("Delete dialog not found!");
 }
}


// --- Handle the initial view load when the page loads ---
document.addEventListener('DOMContentLoaded', () => {
    // Determine the initial view to load. Could be 'home' by default.
    // Or you could check the URL hash (e.g., #settings) to load a specific view on page load.
    const initialView = 'home'; // Set your desired default view
    switchViews(initialView); // Load the initial view
});

// --- Helper function to fetch and inject partial HTML ---
// This is used by the specific cases like 'ascents', 'saved', etc.
// It's refactored to handle potential target container issues and accept init functions
/* The switchViews cases for 'ascents', 'saved', etc. already use this pattern,
   but I've kept the refactored helper function signature consistent with the main switchViews calls.
   You might need to adjust how targetContainer is found if IDs like profileFeed/userFeed
   are not always present in the base HTML or are nested differently.
*/
async function fetchAndInjectPartial(htmlFileName, targetElementId, targetContainer, initializationFunction = null) {
     if (!targetContainer) {
         console.error(`Target container not found for ${htmlFileName}`);
         return;
     }
     targetContainer.innerHTML = '<p class="text-center text-gray-500">Loading...</p>';

     try {
         const response = await fetch(htmlFileName);
         if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status} from ${htmlFileName}`);
         }
         const data = await response.text();
         const parser = new DOMParser();
         const doc = parser.parseFromString(data, "text/html");
         const targetElement = doc.getElementById(targetElementId);

         if (targetElement) {
             targetContainer.innerHTML = targetElement.innerHTML;

             if (initializationFunction) {
                 // Pass the target container to the init function if it needs it
                 initializationFunction(targetContainer);
             }
         } else {
             console.error(`${targetElementId} not found in fetched ${htmlFileName}`);
             targetContainer.innerHTML = `<p class="text-center text-red-500">Error loading content.</p>`;
         }
     } catch (error) {
         console.error(`Error fetching or processing ${htmlFileName}:`, error);
         targetContainer.innerHTML = `<p class="text-center text-red-500">Error loading content.</p>`;
     }
}


// You might also need initialization functions for other views if they have specific JS logic:
// function initializeChallengesView() { console.log("Challenges init"); }
// function initializeCommunitiesView() { console.log("Communities init"); }
// function initializeProfileView() { console.log("Profile init"); }
// function initializeRoutesView() { console.log("Routes init"); }
// function initializeExploreView() { console.log("Explore init"); }
// function initializeAscentsView() { console.log("Ascents init"); } // If ascents have JS logic
// function initializeSavedRoutesView() { console.log("Saved Routes init"); } // If saved routes have JS logic
// function initializeUserPostsView() { console.log("User Posts init"); } // If user posts have JS logic
// function initializeUserRoutesView() { console.log("User Routes init"); } // If user routes have JS logic
// function initializeSingleRouteView() { console.log("Single Route init"); } // If single route has JS logic
// function initializePostRouteView() { console.log("Post Route init"); } // If post route has JS logic
// function initializeSingleCommunityView() { console.log("Single Community init"); } // If single community has JS logic
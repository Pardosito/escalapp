async function fetchClimbingRoutes() {
    try {
        const response = await fetch('/routes');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const routes = await response.json();

        const routesContainer = document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3.gap-6');
        routesContainer.innerHTML = '';

        if (!Array.isArray(routes)) {
            console.error('Expected an array of routes, but received:', routes);
            routesContainer.innerHTML = '<p>Error: Could not load routes.</p>';
            return;
        }

        routes.forEach(route => {
            const routeElement = document.createElement('div');
            routeElement.classList.add('bg-white', 'border', 'border-gray-200', 'rounded-lg', 'shadow-md', 'overflow-hidden');
            routeElement.innerHTML = `
                <img src="${route.imageUrl || 'default_route_image.jpg'}" alt="${route.title || 'Climbing Route'}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <div class="flex justify-between items-center mb-2">
                        <h2 class="text-xl font-semibold">${route.title || 'Route Title'}</h2>
                        <span class="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded">${route.difficulty || 'Unknown'}</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-600 mb-2">
                        <i class="lucide lucide-map-pin mr-2"></i>
                        ${route.location || 'Location Unknown'}
                    </div>
                    <p class="text-gray-700 mb-4">${route.description || ''}</p>
                    <div class="flex justify-between items-center">
                        <div class="flex items-center">
                            <span class="text-yellow-500 mr-1">★</span>
                            <span class="text-gray-600">${route.rating || 'No Rating'}</span>
                        </div>
                        <div class="flex space-x-1">
                            ${(route.tags || []).map(tag => `<span class="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">${tag}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;
            routesContainer.appendChild(routeElement);
        });

    } catch (error) {
        console.error('Error fetching or processing climbing routes:', error);
        routesContainer.innerHTML = '<p>Could not load climbing routes. Please try again later.</p>';
    }
}

window.addEventListener('load', fetchClimbingRoutes);
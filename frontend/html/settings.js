function switchTab(tabValue) {
            document.querySelectorAll('[data-tab-content]').forEach(content => {
            content.classList.add('hidden');
            });

            document.querySelectorAll('[data-tab-trigger]').forEach(trigger => {
            trigger.classList.remove('bg-blue-500', 'text-white');
            });

            document.querySelector(`[data-tab-content="${tabValue}"]`).classList.remove('hidden');
            document.querySelector(`[data-tab-trigger="${tabValue}"]`).classList.add('bg-blue-500', 'text-white');
        }

function toggleDeleteDialog() {
    const dialog = document.getElementById('delete-dialog');
    dialog.classList.toggle('hidden');
}
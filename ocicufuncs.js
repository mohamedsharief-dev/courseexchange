let state = {
  querySet: [],
  filteredCourses: [],
  page: 1,
  rows: 10,
  noPrerequisitesFilter: false,
};

async function fetchCourses() {
  document.getElementById('loader').style.display = 'block'; // Show the loader
  const response = await fetch('https://elbert-api-qa.azurewebsites.net/api/readonly/courses/OCICU');
  if (!response.ok) throw new Error('Network response was not ok');
  const data = await response.json();
  localStorage.setItem('coursesData', JSON.stringify(data));
  state.querySet = data; 
  return data;
}

function uniqueValues(data, key) {
  let values;
  if (data.length > 0 && Array.isArray(data[0][key])) {
    // Flatten the array of arrays (for tags) and then extract unique values
    values = Array.from(new Set(data.flatMap(item => item[key])));
  } else {
    // Original logic for non-array values
    values = Array.from(new Set(data.map(item => item[key])));
  }
  // Filter out falsey values and sort alphabetically
  return values.filter(Boolean).sort();
}

function resetFilters() {
event.preventDefault();
  // Uncheck all checkboxes
  document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = false;
  });
  
  const searchInput = document.getElementById('field');
  if (searchInput) searchInput.value = '';

  // Uncheck the toggles and update state
  document.getElementById('ms1').checked = false;
  document.getElementById('ms2').checked = false;
  state.noPrerequisitesFilter = false;

  // Clear any chips (visual filter indicators)
  const chipsDiv = document.getElementById('ChipsDiv');
  while (chipsDiv.firstChild) {
    chipsDiv.removeChild(chipsDiv.firstChild);
  }
  
  // Reset the date inputs
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';

  // Reset filteredCourses to the entire set
  state.filteredCourses = [...state.querySet]; 
  const allSubcategories = uniqueValues(state.querySet, 'courseSubCategory');
  populateCheckboxFilter('subcategory-filter', allSubcategories, true);
  updateResultsCounter(state.filteredCourses); 
  displayCourses(state.filteredCourses, 1, state.rows);
}


function populateCheckboxFilter(filterId, options, clearExisting = true) {
  const filterContainer = document.getElementById(filterId);
  if (clearExisting) {
    filterContainer.innerHTML = ''; // Clear existing options
  }
  options.forEach(option => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = option;
    checkbox.name = option;
    checkbox.value = option;
    checkbox.addEventListener('change', () => {
      filterAndDisplayCourses();
    });
    const label = document.createElement('label');
    label.htmlFor = option;
    label.appendChild(document.createTextNode(option));
    const wrapper = document.createElement('div');
    wrapper.classList.add('filter-option');
    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    filterContainer.appendChild(wrapper);
  });
}




function createChip(value) {
  const chipsDiv = document.getElementById('ChipsDiv');
  const chip = document.createElement('div');
  chip.className = 'chip';
  chip.textContent = value;
  const closeBtn = document.createElement('span');
  closeBtn.className = 'close-btn';
  closeBtn.textContent = '×';
  closeBtn.onclick = () => {
    removeChip(value);
    filterAndDisplayCourses();
  };
  chip.appendChild(closeBtn);
  chipsDiv.appendChild(chip);
}

function removeChip(value) {
    const chips = document.querySelectorAll('#ChipsDiv .chip');
    chips.forEach(chip => {
        if (chip.textContent.includes(value)) {
            chip.parentNode.removeChild(chip);
            uncheckCheckbox(value);
            // Check if the chip is a date chip and reset the corresponding date input
            if (value.startsWith('Start:')) {
                document.getElementById('startDate').value = '';
            } else if (value.startsWith('End:')) {
                document.getElementById('endDate').value = '';
            }
        }
    });
}

function uncheckCheckbox(value) {
  document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(checkbox => {
    if (checkbox.value === value) {
      checkbox.checked = false;
    }
  });
}

function clearChips() {
  const chipsDiv = document.getElementById('ChipsDiv');
  while (chipsDiv.firstChild) {
    chipsDiv.removeChild(chipsDiv.firstChild);
  }
}

function alphaNumericSort(a, b) {
    const regex = /(\d*)(.*)/; // Regex to capture numeric prefix and the rest of the string
    let [ , aNum, aAlpha ] = a.match(regex);
    let [ , bNum, bAlpha ] = b.match(regex);

    // If both parts start with letters or both start with numbers, sort normally
    if ((aNum === '' && bNum === '') || (aNum !== '' && bNum !== '')) {
        return a.localeCompare(b);
    }

    // If one starts with a number and the other with a letter, the letter comes first
    return aNum === '' ? -1 : 1;
}

function getSubcategoriesForCategory(selectedCategory) {
  return state.querySet
    .filter(course => course.courseCategory === selectedCategory)
    .map(course => course.courseSubCategory)
    .filter((value, index, self) => self.indexOf(value) === index) // Unique values
    .sort();
}

function setupCategoryFilterListener() {
  const categoryFilter = document.getElementById('category-filter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      const selectedCategories = getSelectedCheckboxValues('category-filter');
      const subcategories = selectedCategories.flatMap(category => getSubcategoriesForCategory(category));
      populateCheckboxFilter('subcategory-filter', subcategories);
    });
  }
}



function displayCoursesWithoutPagination(courses) {
    courses.sort((a, b) => alphaNumericSort(a.code, b.code));
    const courseList = document.getElementById('course-list');
    courseList.innerHTML = '';

    // Create headers
    const headers = document.createElement('div');
    headers.className = 'course-card headers';
    headers.innerHTML = `
        <div class="course-logo-header"></div>
        <div class="course-title-header">Course Title</div>
        <div class="course-code-header">Course Code</div>
        <div class="course-provider-header">Provider</div>
        <div class="course-subcategory-header">Category</div>
        <div class="course-level-header">Sub Category</div>
        
    `;
    courseList.appendChild(headers);

    courses.forEach(course => {
        const courseLink = document.createElement('a');
        courseLink.href = `/coursedetails?courseCode=${encodeURIComponent(course.code)}&providerName=${encodeURIComponent(course.providerName)}`;
        courseLink.className = 'course-card-link';

        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';

        const logo = document.createElement('img');
        logo.src = course.logoUrl;
        logo.alt = 'Course Logo';
        logo.className = 'course-logo';

        const title = document.createElement('h3');
        title.textContent = course.title;
        title.className = 'course-title';

        const code = document.createElement('p');
        code.textContent = course.code;
        code.className = 'course-code';

        const provider = document.createElement('p');
        provider.textContent = course.providerName;
        provider.className = 'course-provider';

        const category = document.createElement('p');
        category.textContent = course.courseCategory; 
        category.className = 'course-category';

        const subcategory = document.createElement('p');
        subcategory.textContent = course.courseSubCategory;
        subcategory.className = 'course-subcategory';


        

        courseCard.appendChild(logo);
        courseCard.appendChild(title);
        courseCard.appendChild(code);
        courseCard.appendChild(provider);
        courseCard.appendChild(category); 
        courseCard.appendChild(subcategory); 
        

        courseLink.appendChild(courseCard);
        courseList.appendChild(courseLink);
    });

    const paginationDiv = document.getElementById('pagination');
    if (paginationDiv) {
        paginationDiv.style.display = 'none';
    }
}

function getSelectedCheckboxValues(filterId) {
  const checkboxes = document.querySelectorAll(`#${filterId} input[type="checkbox"]:checked`);
  return Array.from(checkboxes).map(checkbox => checkbox.value);
}

function getClosestSession(sessions) {
  return sessions.length > 0 ? sessions[0] : null;
}

function filterAndDisplayCourses() {
    clearChips();
    const selectedProviders = getSelectedCheckboxValues('provider-filter');
    const selectedLevels = getSelectedCheckboxValues('level-filter');
    const selectedCategories = getSelectedCheckboxValues('category-filter');
    const selectedSubcategories = getSelectedCheckboxValues('subcategory-filter');
    const selectedTags = getSelectedCheckboxValues('tag-filter');
    const selectedStartDate = document.getElementById('startDate').value; // Fetch start date
    const selectedEndDate = document.getElementById('endDate').value;     // Fetch end date
    const isUpcomingToggleChecked = document.getElementById('ms1').checked;
    const currentDate = new Date();

    const searchInput = document.getElementById('field').value.toLowerCase(); // Get value from search input

    // Create chips for all selected filters and dates
    const allSelectedFilters = [...selectedProviders, ...selectedLevels, ...selectedCategories, ...selectedSubcategories, ...selectedTags];
    if (selectedStartDate) allSelectedFilters.push(`Start: ${selectedStartDate}`);
    if (selectedEndDate) allSelectedFilters.push(`End: ${selectedEndDate}`);
    allSelectedFilters.forEach(filter => createChip(filter));

    const filteredCourses = state.querySet.filter(course => {
        const providerMatch = !selectedProviders.length || selectedProviders.includes(course.providerName);
        const levelMatch = !selectedLevels.length || selectedLevels.includes(course.courseLevel);
        const categoryMatch = !selectedCategories.length || selectedCategories.includes(course.courseCategory);
        const subcategoryMatch = !selectedSubcategories.length || selectedSubcategories.includes(course.courseSubCategory);
        const tagMatch = !selectedTags.length || selectedTags.some(tag => course.tags.includes(tag));

        // Date filter adjusted to handle sessions
        const startDateMatch = !selectedStartDate || course.sessions.some(session => new Date(session.startDate) >= new Date(selectedStartDate));
        const endDateMatch = !selectedEndDate || course.sessions.some(session => new Date(session.endDate) <= new Date(selectedEndDate));

        const upcomingSessionMatch = !isUpcomingToggleChecked || course.sessions.some(session => new Date(session.startDate) > currentDate);
        const noPrerequisitesMatch = !state.noPrerequisitesFilter || course.prerequisites === '' || (course.prerequisites && course.prerequisites.toLowerCase() === 'none');

        // Search filter
        const titleMatch = course.title.toLowerCase().includes(searchInput);
        const descriptionMatch = course.courseDescription.toLowerCase().includes(searchInput);
        const providerSearchMatch = course.providerName.toLowerCase().includes(searchInput);
        const categorySearchMatch = course.courseCategory.toLowerCase().includes(searchInput);
        const subcategorySearchMatch = course.courseSubCategory.toLowerCase().includes(searchInput);
        const codeMatch = course.code.toLowerCase().includes(searchInput); // New condition for course code

       return  providerMatch && levelMatch && categoryMatch && subcategoryMatch && tagMatch &&
               startDateMatch && endDateMatch &&
               upcomingSessionMatch && noPrerequisitesMatch &&
               (titleMatch || descriptionMatch || providerSearchMatch || categorySearchMatch || subcategorySearchMatch || codeMatch);
    });
  
    state.filteredCourses.sort((a, b) => alphaNumericSort(a.code, b.code));
    updateResultsCounter(filteredCourses);
    displayCoursesWithoutPagination(filteredCourses);
}

function updateResultsCounter(filteredCourses) {
    const resultsCounter = document.getElementById('results-counter');
    if (resultsCounter) {
        let courseCount;

        // Check if filteredCourses is defined and is an array
        if (Array.isArray(filteredCourses)) {
            courseCount = filteredCourses.length;
        }

        // If courseCount is undefined, not a number, or greater than 1000, display "1000+"
        const displayCount = (!courseCount || isNaN(courseCount) || courseCount > 1000) ? "1000+" : courseCount;

        resultsCounter.innerHTML = `Showing <span style="font-weight: bold; color: #b3ce67; background: #626262; padding: 5px; border-radius: 10px;">${displayCount}</span> courses out of ${state.querySet.length} available.`;
    }
}

function displayCourses(courses, page = 1, rows = 10) {
    courses.sort((a, b) => alphaNumericSort(a.code, b.code));
    localStorage.setItem('savedPage', page.toString());
    localStorage.setItem('savedRows', rows.toString());
    const startIndex = (page - 1) * rows;
    const endIndex = startIndex + rows;
    const paginatedItems = courses.slice(startIndex, endIndex);

    const courseList = document.getElementById('course-list');
    courseList.innerHTML = '';

    // Create headers
    const headers = document.createElement('div');
    headers.className = 'course-card headers';
    headers.innerHTML = `
        <div class="course-logo-header"></div>
        <div class="course-title-header">Course Title</div>
        <div class="course-code-header">Course Code</div>
        <div class="course-provider-header">Provider</div>
        <div class="course-subcategory-header">Category</div>
        <div class="course-level-header">Sub Category</div>
        
    `;
    courseList.appendChild(headers);

    paginatedItems.forEach(course => {
        const courseLink = document.createElement('a');
        courseLink.href = `/coursedetails?courseCode=${encodeURIComponent(course.code)}&providerName=${encodeURIComponent(course.providerName)}`;
        courseLink.className = 'course-card-link';

        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';

        const logo = document.createElement('img');
        logo.src = course.logoUrl;
        logo.alt = 'Course Logo';
        logo.className = 'course-logo';

        const title = document.createElement('h3');
        title.textContent = course.title;
        title.className = 'course-title';

        const code = document.createElement('p');
        code.textContent = course.code;
        code.className = 'course-code';

        const provider = document.createElement('p');
        provider.textContent = course.providerName;
        provider.className = 'course-provider';

        const category = document.createElement('p');
        category.textContent = course.courseCategory;
        category.className = 'course-category';

        const subcategory = document.createElement('p');
        subcategory.textContent = course.courseSubCategory;
        subcategory.className = 'course-subcategory';
      
       

        courseCard.appendChild(logo);
        courseCard.appendChild(title);
        courseCard.appendChild(code);
        courseCard.appendChild(provider);
        courseCard.appendChild(category); 
        courseCard.appendChild(subcategory); 
     

        courseLink.appendChild(courseCard);
        courseList.appendChild(courseLink);
    });

    const paginationDiv = document.getElementById('pagination');
    if (paginationDiv) {
        paginationDiv.style.display = 'block';
    }

    updateResultsCounter(paginatedItems.length, courses.length);
    updatePagination(courses.length, page, rows);
}



function applySavedFilters() {
    const savedFilters = JSON.parse(localStorage.getItem('savedFilters'));
    if (savedFilters) {
        // Iterate through each filter category
        for (const filterCategory in savedFilters) {
            // Apply saved filter values to corresponding checkboxes
            savedFilters[filterCategory].forEach(filterValue => {
                const checkbox = document.querySelector(`input[name="${filterCategory}"][value="${filterValue}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }
        filterAndDisplayCourses(); // Apply filter to courses
    }
}

function updatePagination(totalItems, currentPage, rowsPerPage) {
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = '';

    const pageCount = Math.ceil(totalItems / rowsPerPage);
    const maxPagesToShow = 4;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(pageCount, startPage + maxPagesToShow - 1);

    // Adjust start and end page if less than maxPagesToShow pages are available
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    // Left navigation arrow
    const leftArrow = document.createElement('button');
    leftArrow.innerHTML = '&laquo;';
    leftArrow.disabled = currentPage === 1;
    leftArrow.onclick = () => displayCourses(state.querySet, currentPage - 1, rowsPerPage);
    paginationDiv.appendChild(leftArrow);

    // Ellipses and first page if there's a gap
    if (startPage > 1) {
        const firstPageBtn = createPageButton(1, currentPage, rowsPerPage);
        paginationDiv.appendChild(firstPageBtn);

        if (startPage > 2) {
            const ellipses = document.createElement('span');
            ellipses.textContent = '...';
            paginationDiv.appendChild(ellipses);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageButton = createPageButton(i, currentPage, rowsPerPage);
        paginationDiv.appendChild(pageButton);
    }

    // Ellipses and last page if there's a gap
    if (endPage < pageCount) {
        if (endPage < pageCount - 1) {
            const ellipses = document.createElement('span');
            ellipses.textContent = '...';
            paginationDiv.appendChild(ellipses);
        }

        const lastPageBtn = createPageButton(pageCount, currentPage, rowsPerPage);
        paginationDiv.appendChild(lastPageBtn);
    }

    // Right navigation arrow
    const rightArrow = document.createElement('button');
    rightArrow.innerHTML = '&raquo;';
    rightArrow.disabled = currentPage === pageCount;
    rightArrow.onclick = () => displayCourses(state.querySet, currentPage + 1, rowsPerPage);
    paginationDiv.appendChild(rightArrow);
}


function createPageButton(pageNumber, currentPage, rowsPerPage) {
    const button = document.createElement('button');
    button.textContent = pageNumber;
    button.onclick = () => displayCourses(state.querySet, pageNumber, rowsPerPage);
    if (currentPage === pageNumber) {
        button.className = 'active';
    }
    return button;
}

function setupEventListeners() {
  document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', filterAndDisplayCourses);
  });

  document.getElementById('startDate').addEventListener('change', filterAndDisplayCourses);
  document.getElementById('endDate').addEventListener('change', filterAndDisplayCourses);
  
  const toggleChange = (event) => {
    if (event.target.id === 'ms2') {
      state.noPrerequisitesFilter = event.target.checked;
    }
    filterAndDisplayCourses();
    setupCategoryFilterListener();
  };

  document.getElementById('ms1').addEventListener('change', toggleChange);
  document.getElementById('ms2').addEventListener('change', toggleChange);

  const searchInput = document.getElementById('field');
  if (searchInput) {
    searchInput.addEventListener('input', filterAndDisplayCourses);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const courses = await fetchCourses();
    state.filteredCourses = [...courses];
    populateCheckboxFilter('provider-filter', uniqueValues(courses, 'providerName'));
    populateCheckboxFilter('level-filter', uniqueValues(courses, 'courseLevel'));
    populateCheckboxFilter('category-filter', uniqueValues(courses, 'courseCategory'));
    populateCheckboxFilter('subcategory-filter', uniqueValues(courses, 'courseSubCategory'));
    populateCheckboxFilter('tag-filter', uniqueValues(courses, 'tags'));
    applySavedFilters();
    displayCourses(courses, state.page, state.rows);
    updateResultsCounter(courses);
    const resetBtn = document.createElement('button');
    resetBtn.innerHTML = 'X Reset All';
    resetBtn.className = 'reset-button';
    resetBtn.onclick = resetFilters;
    document.getElementById('ChipsCont').appendChild(resetBtn);
    document.getElementById('loader').style.display = 'none';
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('loader').style.display = 'none';
  }
  setupEventListeners();
  setupCategoryFilterListener();
});



export const calculateTimeGone = (dateInput?: string | Date) => {
  const now = dateInput ? new Date(dateInput) : new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Get total days in current month
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  
  let totalWorkingDays = 0;
  let passedWorkingDays = 0;

  // Loop through all days to count working days (Exclude Fridays - Day 5)
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const currentDayDate = new Date(year, month, day);
    const dayOfWeek = currentDayDate.getDay();
    
    // Assuming Friday (5) is the weekend. Update if Saturday is also off.
    if (dayOfWeek !== 5) {
      totalWorkingDays++;
      // Check if this day is before or equal to the selected date
      if (day <= now.getDate()) {
        passedWorkingDays++;
      }
    }
  }

  const percentage = totalWorkingDays > 0 ? (passedWorkingDays / totalWorkingDays) * 100 : 0;
  
  return {
    percentage: Math.min(percentage, 100),
    passedWorkingDays,
    totalWorkingDays,
    dateString: now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  };
};

export const formatNumber = (num: number) => {
  if (!num) return '0';
  // Compact formatting for Billions/Millions (e.g., 1.2B, 500K)
  return new Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(num);
};

export const formatCurrency = (num: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EGP',
    notation: "compact",
    maximumFractionDigits: 1
  }).format(num).replace('EGP', '').trim();
};

export const getUniqueValues = (data: any[], key: string): string[] => {
  const values = new Set(data.map(item => item[key]).filter(Boolean));
  return Array.from(values).sort() as string[];
};
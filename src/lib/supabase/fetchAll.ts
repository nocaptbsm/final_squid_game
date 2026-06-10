export async function fetchAll(query: any) {
  let allData: any[] = []
  let from = 0
  const step = 999

  while (true) {
    const { data, error } = await query.range(from, from + step)
    if (error) throw error
    if (!data || data.length === 0) break
    
    allData = allData.concat(data)
    
    if (data.length <= step) break
    from += step + 1
  }

  return allData
}

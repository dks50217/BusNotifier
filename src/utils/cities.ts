export interface CityOption {
  value: string   // TDX API city code
  label: string   // 中文顯示名稱
}

export const CITIES: CityOption[] = [
  { value: 'Taipei',           label: '台北市' },
  { value: 'NewTaipei',        label: '新北市' },
  { value: 'Taoyuan',          label: '桃園市' },
  { value: 'Taichung',         label: '台中市' },
  { value: 'Tainan',           label: '台南市' },
  { value: 'Kaohsiung',        label: '高雄市' },
  { value: 'Keelung',          label: '基隆市' },
  { value: 'Hsinchu',          label: '新竹市' },
  { value: 'HsinchuCounty',    label: '新竹縣' },
  { value: 'MiaoliCounty',     label: '苗栗縣' },
  { value: 'ChanghuaCounty',   label: '彰化縣' },
  { value: 'NantouCounty',     label: '南投縣' },
  { value: 'YunlinCounty',     label: '雲林縣' },
  { value: 'ChiayiCounty',     label: '嘉義縣' },
  { value: 'Chiayi',           label: '嘉義市' },
  { value: 'PingtungCounty',   label: '屏東縣' },
  { value: 'YilanCounty',      label: '宜蘭縣' },
  { value: 'HualienCounty',    label: '花蓮縣' },
  { value: 'TaitungCounty',    label: '臺東縣' },
  { value: 'KinmenCounty',     label: '金門縣' },
  { value: 'PenghuCounty',     label: '澎湖縣' },
]

export const DEFAULT_CITY = CITIES[0].value // 'Taipei'

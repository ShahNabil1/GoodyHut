// Bangladesh Division → District → Thana/Upazila data
export interface GeoData {
  [division: string]: {
    [district: string]: string[];
  };
}

export const bangladeshGeo: GeoData = {
  "Dhaka": {
    "Dhaka": ["Dhanmondi", "Gulshan", "Mirpur", "Mohammadpur", "Uttara", "Tejgaon", "Ramna", "Motijheel", "Lalbagh", "Kotwali", "Demra", "Sabujbagh", "Kafrul", "Pallabi", "Shah Ali", "Turag", "Badda", "Khilgaon", "Kadamtali", "Hazaribagh", "Kamrangirchar", "Bangshal", "Wari", "Sutrapur", "Shyampur", "Jatrabari", "Cantonment", "Adabor", "Sher-e-Bangla Nagar", "Bimanbandar"],
    "Gazipur": ["Gazipur Sadar", "Kaliakair", "Kapasia", "Sreepur", "Kaliganj", "Tongi"],
    "Narayanganj": ["Narayanganj Sadar", "Araihazar", "Sonargaon", "Bandar", "Rupganj"],
    "Tangail": ["Tangail Sadar", "Mirzapur", "Gopalpur", "Basail", "Madhupur", "Delduar", "Nagarpur", "Sakhipur", "Kalihati", "Ghatail", "Dhanbari", "Bhuapur"],
    "Kishoreganj": ["Kishoreganj Sadar", "Bhairab", "Bajitpur", "Hossainpur", "Pakundia", "Katiadi", "Karimganj", "Tarail", "Itna", "Mithamain", "Austagram", "Nikli", "Kuliarchar"],
    "Manikganj": ["Manikganj Sadar", "Singair", "Saturia", "Harirampur", "Ghior", "Shibalaya", "Daulatpur"],
    "Munshiganj": ["Munshiganj Sadar", "Sreenagar", "Sirajdikhan", "Lohajang", "Tongibari", "Gazaria"],
    "Narsingdi": ["Narsingdi Sadar", "Belabo", "Monohardi", "Palash", "Raipura", "Shibpur"],
    "Madaripur": ["Madaripur Sadar", "Kalkini", "Rajoir", "Shibchar"],
    "Gopalganj": ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"],
    "Faridpur": ["Faridpur Sadar", "Alfadanga", "Bhanga", "Boalmari", "Char Bhadrasan", "Madhukhali", "Nagarkanda", "Sadarpur", "Saltha"],
    "Rajbari": ["Rajbari Sadar", "Goalanda", "Pangsha", "Baliakandi", "Kalukhali"],
    "Shariatpur": ["Shariatpur Sadar", "Damudya", "Gosairhat", "Naria", "Bhedarganj", "Zanjira"],
  },
  "Chattogram": {
    "Chattogram": ["Kotwali", "Panchlaish", "Pahartali", "Bayazid", "Double Mooring", "Halishahar", "Patenga", "Bakalia", "Chandgaon", "Khulshi", "Bandar", "Anwara", "Boalkhali", "Fatikchhari", "Hathazari", "Lohagara", "Mirsharai", "Patiya", "Rangunia", "Raozan", "Sandwip", "Satkania", "Sitakunda"],
    "Cox's Bazar": ["Cox's Bazar Sadar", "Chakaria", "Kutubdia", "Maheshkhali", "Ramu", "Teknaf", "Ukhia", "Pekua"],
    "Comilla": ["Comilla Sadar", "Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram", "Daudkandi", "Debidwar", "Homna", "Laksam", "Meghna", "Muradnagar", "Nangalkot", "Titas", "Monoharganj", "Lalmai"],
    "Noakhali": ["Noakhali Sadar", "Begumganj", "Chatkhil", "Companiganj", "Hatiya", "Kabirhat", "Senbagh", "Sonaimuri", "Subarnachar"],
    "Feni": ["Feni Sadar", "Chhagalnaiya", "Daganbhuiyan", "Parshuram", "Sonagazi", "Fulgazi"],
    "Lakshmipur": ["Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgati", "Kamalnagar"],
    "Chandpur": ["Chandpur Sadar", "Faridganj", "Haimchar", "Haziganj", "Kachua", "Matlab Dakshin", "Matlab Uttar", "Shahrasti"],
    "Brahmanbaria": ["Brahmanbaria Sadar", "Ashuganj", "Bancharampur", "Bijoynagar", "Kasba", "Nabinagar", "Nasirnagar", "Sarail", "Akhaura"],
    "Rangamati": ["Rangamati Sadar", "Bagaichhari", "Barkal", "Belaichhari", "Juraichhari", "Kaptai", "Kawkhali", "Langadu", "Naniarchar", "Rajasthali"],
    "Khagrachhari": ["Khagrachhari Sadar", "Dighinala", "Lakshmichhari", "Mahalchhari", "Manikchhari", "Matiranga", "Panchhari", "Ramgarh"],
    "Bandarban": ["Bandarban Sadar", "Alikadam", "Lama", "Naikhongchhari", "Rowangchhari", "Ruma", "Thanchi"],
  },
  "Rajshahi": {
    "Rajshahi": ["Rajshahi Sadar", "Boalia", "Rajpara", "Shah Makhdum", "Bagha", "Bagmara", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Paba", "Puthia", "Tanore"],
    "Bogra": ["Bogra Sadar", "Adamdighi", "Dhunat", "Dhupchanchia", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Shajahanpur", "Sherpur", "Shibganj", "Sonatala"],
    "Natore": ["Natore Sadar", "Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Singra", "Naldanga"],
    "Naogaon": ["Naogaon Sadar", "Atrai", "Badalgachhi", "Dhamoirhat", "Manda", "Mohadevpur", "Niamatpur", "Patnitala", "Porsha", "Raninagar", "Sapahar"],
    "Chapainawabganj": ["Chapainawabganj Sadar", "Bholahat", "Gomostapur", "Nachole", "Shibganj"],
    "Pabna": ["Pabna Sadar", "Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi", "Santhia", "Sujanagar"],
    "Sirajganj": ["Sirajganj Sadar", "Belkuchi", "Chauhali", "Kamarkhanda", "Kazipur", "Raiganj", "Shahjadpur", "Tarash", "Ullahpara"],
    "Joypurhat": ["Joypurhat Sadar", "Akkelpur", "Kalai", "Khetlal", "Panchbibi"],
  },
  "Khulna": {
    "Khulna": ["Khulna Sadar", "Batiaghata", "Dacope", "Daulatpur", "Dumuria", "Dighalia", "Koyra", "Paikgachha", "Phultala", "Rupsa", "Terokhada", "Khalishpur", "Khan Jahan Ali", "Sonadanga"],
    "Jessore": ["Jessore Sadar", "Abhaynagar", "Bagherpara", "Chaugachha", "Jhikargachha", "Keshabpur", "Manirampur", "Sharsha"],
    "Satkhira": ["Satkhira Sadar", "Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Shyamnagar", "Tala"],
    "Bagerhat": ["Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola"],
    "Narail": ["Narail Sadar", "Kalia", "Lohagara"],
    "Kushtia": ["Kushtia Sadar", "Bheramara", "Daulatpur", "Khoksa", "Kumarkhali", "Mirpur"],
    "Magura": ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"],
    "Meherpur": ["Meherpur Sadar", "Gangni", "Mujibnagar"],
    "Chuadanga": ["Chuadanga Sadar", "Alamdanga", "Damurhuda", "Jibannagar"],
    "Jhenaidah": ["Jhenaidah Sadar", "Harinakunda", "Kaliganj", "Kotchandpur", "Maheshpur", "Shailkupa"],
  },
  "Sylhet": {
    "Sylhet": ["Sylhet Sadar", "Balaganj", "Beanibazar", "Bishwanath", "Companiganj", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Osmani Nagar", "South Surma", "Zakiganj"],
    "Moulvibazar": ["Moulvibazar Sadar", "Barlekha", "Juri", "Kamalganj", "Kulaura", "Rajnagar", "Sreemangal"],
    "Habiganj": ["Habiganj Sadar", "Ajmiriganj", "Bahubal", "Baniachong", "Chunarughat", "Lakhai", "Madhabpur", "Nabiganj", "Shaistaganj"],
    "Sunamganj": ["Sunamganj Sadar", "Bishwamvarpur", "Chhatak", "Derai", "Dharampasha", "Dowarabazar", "Jagannathpur", "Jamalganj", "Sulla", "Tahirpur", "South Sunamganj"],
  },
  "Rangpur": {
    "Rangpur": ["Rangpur Sadar", "Badarganj", "Gangachara", "Kaunia", "Mithapukur", "Pirgachha", "Pirganj", "Taraganj"],
    "Dinajpur": ["Dinajpur Sadar", "Birampur", "Birganj", "Biral", "Bochaganj", "Chirirbandar", "Fulbari", "Ghoraghat", "Hakimpur", "Kaharole", "Khansama", "Nawabganj", "Parbatipur"],
    "Kurigram": ["Kurigram Sadar", "Bhurungamari", "Char Rajibpur", "Chilmari", "Nageshwari", "Phulbari", "Rajarhat", "Raumari", "Ulipur"],
    "Gaibandha": ["Gaibandha Sadar", "Fulchhari", "Gobindaganj", "Palashbari", "Sadullapur", "Saghata", "Sundarganj"],
    "Lalmonirhat": ["Lalmonirhat Sadar", "Aditmari", "Hatibandha", "Kaliganj", "Patgram"],
    "Nilphamari": ["Nilphamari Sadar", "Dimla", "Domar", "Jaldhaka", "Kishoreganj", "Saidpur"],
    "Thakurgaon": ["Thakurgaon Sadar", "Baliadangi", "Haripur", "Pirganj", "Ranisankail"],
    "Panchagarh": ["Panchagarh Sadar", "Atwari", "Boda", "Debiganj", "Tetulia"],
  },
  "Barisal": {
    "Barisal": ["Barisal Sadar", "Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Gaurnadi", "Hizla", "Mehendiganj", "Muladi", "Wazirpur"],
    "Bhola": ["Bhola Sadar", "Borhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin"],
    "Jhalokati": ["Jhalokati Sadar", "Kathalia", "Nalchity", "Rajapur"],
    "Patuakhali": ["Patuakhali Sadar", "Bauphal", "Dashmina", "Dumki", "Galachipa", "Kalapara", "Mirzaganj", "Rangabali"],
    "Pirojpur": ["Pirojpur Sadar", "Bhandaria", "Kawkhali", "Mathbaria", "Nazirpur", "Nesarabad", "Zianagar"],
    "Barguna": ["Barguna Sadar", "Amtali", "Bamna", "Betagi", "Patharghata", "Taltali"],
  },
  "Mymensingh": {
    "Mymensingh": ["Mymensingh Sadar", "Bhaluka", "Dhobaura", "Fulbaria", "Gaffargaon", "Gauripur", "Haluaghat", "Ishwarganj", "Muktagachha", "Nandail", "Phulpur", "Trishal", "Tarakanda"],
    "Jamalpur": ["Jamalpur Sadar", "Baksiganj", "Dewanganj", "Islampur", "Madarganj", "Melandaha", "Sarishabari"],
    "Netrokona": ["Netrokona Sadar", "Atpara", "Barhatta", "Durgapur", "Kalmakanda", "Kendua", "Khaliajuri", "Madan", "Mohanganj", "Purbadhala"],
    "Sherpur": ["Sherpur Sadar", "Jhenaigati", "Nakla", "Nalitabari", "Sreebardi"],
  },
};

export const divisions = Object.keys(bangladeshGeo);

export const getDistricts = (division: string): string[] => {
  return division ? Object.keys(bangladeshGeo[division] || {}) : [];
};

export const getThanas = (division: string, district: string): string[] => {
  return division && district ? (bangladeshGeo[division]?.[district] || []) : [];
};

/* === Labels, SVG Icons, Menus & Seeded Demo Data (NU-DEMO-001..004, Jobs, Tutors) === */
const names = {student:"นิสิต", employer:"ผู้จ้าง", admin:"เจ้าหน้าที่ มน."};
const groups = {campus:"ในมหาวิทยาลัย", near:"รอบมหาวิทยาลัย", online:"ออนไลน์"};
const jobStates = {draft:["ฉบับร่าง",""], review:["รอตรวจ","wait"], edits:["ส่งกลับให้แก้","bad"], rejected:["ไม่ผ่านการตรวจ","bad"], live:["เปิดรับสมัคร","good"], paused:["ระงับประกาศ","bad"]};
const appStates = {pending:["รอผล","wait"], offered:["ได้รับข้อเสนอ","info"], declined:["ไม่ผ่าน","bad"], withdrawn:["ถอนใบสมัครแล้ว","bad"], offer_declined:["ปฏิเสธข้อเสนอแล้ว","bad"], resigned:["ลาออกแล้ว","bad"], accepted:["รับเข้าทำงานแล้ว","good"]};
const workStates = {ready:["พร้อมเช็กอิน",""], started:["กำลังทำงาน (เช็กอินแล้ว)","info"], ended:["คาดการณ์ · รอรับรอง","wait"], approved:["อนุมัติแล้ว · รอจ่าย","info"], paid:["จ่ายแล้ว","good"]};
const jobTypeLabels = {"part-time":["พาร์ทไทม์","info"], "full-time":["งานประจำ","good"], online:["งานออนไลน์","wait"]};
const reportStates = {new:["รับเรื่องแล้ว","wait"], reviewing:["กำลังตรวจ","info"], closed:["ตรวจเสร็จ","good"]};
const icons = {
  paw:'<ellipse cx="6" cy="9" rx="2" ry="2.7"/><ellipse cx="11" cy="6" rx="2" ry="2.7"/><ellipse cx="17" cy="8" rx="2" ry="2.7"/><ellipse cx="21" cy="12" rx="1.5" ry="2.2"/><path d="M12 13c-2.2 0-2.8 2-4.5 3.4C5.2 18.3 6.5 22 10 21c1.5-.5 2.5-.5 4 0 3.5 1 4.8-2.7 2.5-4.6C14.8 15 14.2 13 12 13Z"/>',
  grid:'<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
  campus:'<path d="m3 8 9-5 9 5M4 9h16M5 20h14M7 10v8m5-8v8m5-8v8"/>',
  screen:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4m-5 0h10"/>',
  coffee:'<path d="M5 11h12v4a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zm12 0h1.5a2.5 2.5 0 0 1 0 5H17M9 4c-2 2 2 2 0 4m5-4c-2 2 2 2 0 4"/>',
  books:'<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1zm0 0v14"/>',
  event:'<path d="m4 10 14-5v14L4 14zm4 5 2 5H7l-2-6m15-5 2-1m-2 8 2 1"/>',
  arrow:'<path d="m9 6 6 6-6 6"/>',

  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  list:'<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  person:'<circle cx="12" cy="8" r="3"/><path d="M5 20v-2a7 7 0 0 1 14 0v2"/>',
  check:'<path d="m5 12 4 4 10-10"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  error:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4m0 4h.01"/>',
  info:'<circle cx="12" cy="12" r="8"/><path d="M12 12v4m0-8h.01"/>',
  flag:'<path d="M5 21V4m0 1h13l-3 4 3 4H5"/>',
  calendar:'<rect x="4" y="6" width="16" height="15" rx="2"/><path d="M8 3v6m8-6v6M4 11h16m-12 4h2m4 0h2m-8 3h2"/>',
  briefcase:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M3 12a20 20 0 0 0 18 0m-9 1v3"/>',
  wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M21 11h-6a2 2 0 1 0 0 4h6m-5-2h.01"/>',
  pin:'<path d="M19 10c0 5-7 11-7 11s-7-6-7-11a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>'
};
const menus = {
  student:[["home","หางาน","briefcase"],["tutors","หาติวเตอร์","person"],["schedule","ตารางเรียนและงาน","calendar"],["applications","ใบสมัคร","list"],["work","เวลาทำงานและรายได้","wallet"],["profile","โปรไฟล์","person"],["reports","เรื่องที่แจ้ง","flag"]],
  employer:[["home","ประกาศของฉัน","list"],["applications","ผู้สมัครตามประกาศ","person"],["chat","ข้อความแชท","list"],["work","รับรองชั่วโมง","clock"],["reports","ชี้แจงเรื่องร้องเรียน","flag"],["profile","ข้อมูลผู้จ้าง","person"]],
  admin:[["home","ตรวจประกาศ","list"],["profile","ตรวจผู้จ้าง","check"],["reports","เรื่องร้องเรียน","flag"]]
};


const firstStudent = "baitong";
const newStudent = "new-student";
const studentFixtures = {
  [newStudent]: {
    code:"NU-DEMO-004", name:"นที แสนดี", year:1, faculty:"คณะวิทยาศาสตร์",
    major:"วิทยาการคอมพิวเตอร์", contact:"natee@nu.example", photo:"",
    nick:"", intro:"", skills:"", experience:"", interests:[], availability:"",
    schedule:[
      {day:"จันทร์",start:"09:00",end:"11:00",course:"การเขียนโปรแกรมเบื้องต้น",code:"CS101",room:"SC LAB 1",section:"1"},
      {day:"อังคาร",start:"13:00",end:"15:00",course:"คณิตศาสตร์สำหรับคอมพิวเตอร์",code:"CS102",room:"SC 2102",section:"1"}
    ]
  },
  baitong: {
    photo:"data:image/webp;base64,UklGRkwTAABXRUJQVlA4IEATAABwZACdASrgAOAAPlUmj0UjoiEWCFWkOAVEs7durixTuxPvDYRgPuD/M55u2nF705kE0rJsz9jeU+C+efuRxEcgj1qVzy2lwI8V/weZD7A4FSBXVempRsJUAHwUf0Eqdkiub8yoIDEWDv2T6ccS1/12+GnYHk1TR4RaP+tdytxyp5/QAQtcOM40jxxkCt9yTJjb5/U0NTxc+8cTf0h0Tl32jS5HzEd3TTQn4TXDqVWUimXsFZa/jBGo7rlXcnLpRMSVpPtbzX942b1nvbUd2wUe+Ovuo12DEynF5q0qdLOCoi+1chBoIoWgATcKByATDTJDxdJDum1l60MBoBYwm9ITajpl5vg5Zcq8PaT+EvpogbzOrf+VoAj+qk+E4qBqqHhaMEvFaHFHhKNLfy6T3G3aYWja91v54sgxp58wR7q1C+BID5N7Np5RAM6BdStgoAFjkCmMownVSBiP3bI3/aLteaTvGmFOvFf94fODKMvtViOvrnjrWjB18KuqsXG8IjVY58dX+ja7l2yxGlCEKVhHWNGRJC0AK7JuXhUk06X1ZM5xb5+fxAVR16738xq8PRA4iF42xnHX6LWmw6h3fQLAYRQMDo1Ya3GmTBUtiPgGbQDxpvsYF7pCyWwXyYu8LcvJXlCz0F/zrvJPL5aROhb1xpqHuHMrZBkAdOULwHh3WE0IxmVKQGBj/K5zZuWo7obS59jDfCPDl+PrphZPdwZo0uCHSBhvi8LK3WIrDqUfwNHPNOKhKiUUbUDgmVLrzI4PrNzscdxatd4w1jjU6Fy6a2dpbcmzjzQVJPJWqoapTpHweepKBFjr6cHDcSP/Kfrx2OPi3NvMdRO9r5sdbjAyEJ4znlMYwqvckfn195G3uJKzq6gXg1ck47T1k0VmU4wgiaYMRwq3DuhZxIOEwfGFZzf3pv/7SlFhTMXJ6X7mBsTiWTMdOEiqPnBW1B49d/UagAb6QHOWHUdKrGkMcY/tCUYS+wwG4BM4kKeGoUaILIwSYnwa38QX1L+GJtrMe6nWgGNWWBaVimbmX0uHiPi1Vr579gXPJ/XxEaS23R5WZtZyIER1w/uZWCJT4AD+/GTPxcvfwfOwrDkTw5LJsfm/rCRHZ70wpkgGXErr0eHN/JdR1royE0i4cmJ74C0bQmpC/2Xe204Zzg+P74EHWILZG7IJt6BsfX8a4SM5S49lpOTldc+PUWqWOBHfguvZ5ZnAR6JkBfgGwFQ99/59z1P4PruZ/oUUaWRlGcczi27Saqa1lHKe0oXqqbjjZzsAPshtgLHNeTtz6N7yLsKo6iSInPsoc8uCJC42UBqww6mJhnwm/DsV+jLJcgh7+0WA2Lnv6vyOiXICdCdXHqTERXHfZV5PZSbwbaKk+kNwqRITF8rO20JMIppu8YPdfWQTGTq+ja5NwYTxNfRqQTnR0SbNu7I54LBvuy99PrTbK/P7W6kw2xf7h9m1Y9yT21/RQDW/q+CT7pvWP8NwRQblv2f7hJMJ+l28sjUX68VXZqZoSf148s2SlWaubYYbK4uNw2cm0DgaJOKIU3XRqXUjFOhr4wW+VU3jUAkrdMgRu90ncXQqcfdlxYvt3hq4CLcbMB8RZqN0QChqLyHNFXyoIfs7RXP/lXonpW+wGyPSZFHZkDjX/lCUs08ukopMuntsAtYZeQ1MlKV/yg/d8jc0oa7SMr6VjGXc1NW7Hz8+Ey94sB6SkjNIOLlwykjOm1TWjwMapZedbJcGXO3TNvFpM0QBzeV3TknfGHv1DqjLEa0AiKAFGbPfrYNd16Rgh3/92dssh9/Bhs8s77KuvzMt2fwFv+U1bw8bw6jUErZu194/Gz85+rV7GN4zN4bZ91WFQ7nnvgWmu1GHfE5u054lJnMF1T0ngiGhZTuhFdd4Bok5OL045BINIFaQ2wajA9KEMtb/rJzMlFromAnGrg41WZ58xp4bPlkBKEdCid9RJlgHMJNoYlhiW6IpF+CAqa5k69qBWz3vcEeC+v9WVZIVqV8fS4iWwjjM4WzHrdMUcjEuI6153TF/rxsandnqqH3bfRXTLpB4FVmHpqK+R0szCFsvDrke/yiXM/6s+RP1t4EGHluffquniuBWy79a+79CfuZpHxSUUPM2MJjesAD1o6QA/nIUHXJco6lzPYp9DAkCuZQjxOrDelBqyTxfX3TbjYugUQBA4VQOwOL0XXRgFgPer2snmqj+GKv0zvUisR7SK9jX+YB0xAiNnGN0AssUSN5icEtHg3XxwEApiBKSNuTXeP3mG5/W4ePMxbVFNzVkYRDfBBYvhwXK6t5wW9X7LdBXqm19CwoMbrSAlgOioVi7Qeu8qBuG9ZGaUZe5hb2K5/IJ1AGc2z13KqzVUKhol+C/3WxV1IjWHLL+AZxBnvXGN2CXhX0FuR2MHDKfWrTHrfX9Gy9y3EbJea72pR2OjlD7QnZFfyDWuwI62JjlnhXfUDpowkNbFr6uEItFanQDeLFORgVbf7K2Ku5ei0H1cVl0tkikbEgRfZS3K+Rz2F6aEu55osjKeAbIuTjIOfdhjfLGl20IlfHYtfH6P6l09fIAwgOn0MT6M2UWv/LLjx+wYbK/O+toajyJB+WwZ5EB3AoFCZHV751OQ94kZHkXT3SSYy3yrFFeyotYCju98WrlL6kR1ZAf0p6MqKjwuM+U5x1a9DmHaXc/wZvFpMdonnBkBuS0knVMvHjg37BaG5/DwoMrE7/ziAkusqblGd46BCiAQXII63wcWQzxcX74fbwe0j3GcExOCEKlrVrjprIfLRDVyVE0UhoE/SgMNjJL7dGHEkMdkFKN029Ei0HXX3TS1RSmXvLesIF+6yvvLcVso0nBKe+OmppSw+NOQ3BoYXC4WU02tPnwMige37n5jYcap/AH1NGoB/mB8ZcAT+xQ31XTYkwJpfWAuxuhuk24pBN1Gh7z1ozRPcXw2avIINJsi8cShT7WPpGC1JC6ndrqWaqksCH+HDhwzUP2EOYQwXWklpUaTKjVqikNDPafN9+JetqxfjBSi8JStoaYiP24FqA4UUkWKNINAXw8ui2t8/X75tpqkkG+K21OKmseXPe/Ql7cK9jyNJOQM+lkWZtO9eKTFTskDIZNEwpYrVewfGfLLS5tCyH+6fsBih4lS0CSVpuHstDseK+O0pp+peQOLOs5TESUj2+taT4PUgvLOklaMaCVdYQHmqd5xDKtfIuH8E5VmL2g97U/a72Wb3eWAXj426+VVoy4vOlbBDPFIol3n5a32AOumiO0LykC16bsEUmlDg7w1Of0b9Oz1ry7MeOHyxgMqjvGHDsFmAhotmDZw8dX+iz8/P0ZHXmd15MztKikobWQUWIDE0/9qQb2agS5400qEFx8OXfJ4Eb3maI4U8Qb1tF7T3hhcQb9/MawowORoUZpajfJUMx+FXkAMwVGbv2u2GIt1tOD/QnagUWHh2OeWJJcYHBRcRG+fKRq4cLc4jg7su+wvPfhSu3VBB5Yi8fvhEcT7/zFXtZ4gCq03ZdZ/clTSbPeRxGf6abG7dQ7k2b00u4/xY2jEmicxPoztxdirE3S8S82BuajdM6zpolY/wnqqAQf/vyA0Qi4YruiWTsYCzfgVhga1uEs7sU0qnQHKql/MfVT59w8KBPS85+3aaK4avAJLwjkCk58AQCmOMe/tDJ40ogyY2RIq299ydH5L+To7agOEpDK03n0eTBi2CaBjiBHPMaozeZJnNsa6IDhRqA37Z2cmGfFSSkGyXEYZQpkf/vLBazw3dUsAQYiGDuX/ZUd1IOom4kG3V7ggjGV0zUhM9MHrZSABactoRDQKLaxeDFgmfSd+JCR9NBTORIV3BBcQ0pF19ZiIXI7f/x+cg+IdqZ00xzq/7Zvo4S24rTUxw2ZTE3z71WO7TJ8nURDpwS8hfq/U80VUcBNOCUz7TSt9XOYcHIxEbi+HzzwOG8HKNftcDNgnaFJFHR/0v8q5T0qMiz9tLJioaJZ+q0j4ZSOChNE+dx89L7AVC+sZN8znz2ncFsS42WfNX/n8vQTgKg/Y2OAholUHJgARBBNKVFD8O2C49L6pupYKiH619dOE0OIkmXaFavJPWSuvt49GHmd0rHEp8aVPaE1B4g50BP5oTEb+ldyhAIhyfisbOf8Fm5kXXhLQ762hU3Z9WEstTwgnZfjmgvhCO36LvE67uwt+WWPCxi2wvlqMPe5WXUEDpKz5agdG9mdYt9LEYpucYPODd1i2iE7y+lSCVLZiIebYP8elXJjp7lkkZ57rPgGrz9HsDAW0Mf2TtnA5f88QMvHxgvitbqajevt+QYvVacZnHQ9CGv7qQsQQZ8pGhzyHK574CfVvOElvwebrExEdSa5b3y2R7NRIZm1LqSsljDRrcbqPtEyteoCnk46pLZUKJdvUtrMmpgavYooa51B2SELkGqL9UtJ412dZmvkOwt/PYxqR585n76KuZbBbzqDbOJpB8b8SAYDKbwkP8D6Sd7hqc2UaZDgnQ5kFRrMVqrRNPohXZibZ82aGyNp83ZFbfI6rrMnPIOLwQ2qitPiDVKWaZhCcb5C49Tm8Zyd4fnsnHpRDOkuXr/xoKSv+ha6XoMb7mQJfpeAYtUTPQP5QXtBpmIpyY01+QGDM/1Hxz6RVcuoqAWnzQ+Si94e6IO8jz/i0+JLyPScL6jh0WVD5X5XCPmpdZ9bcOYwdS0JvU6gJqdfutm45qyio7yX/NDuPeaUmzqg8SGeGvQ3H/rWn/ObtHYlBDJ1AHM60znN9qw19FaT15/jZXn0RNnpxNthS01aKNLXbgrZCIqsu12GC7wbWnzlrf8PQ5XIsl9j0eyyT8oR7KdNeKoYQpkzT2+mOEdBk9boITrnez3QmjMe2xFkI22/NGHvX3PG5IECz4sSiX7ACup99IaCRZWFW4PwU6pr/qTyW3JZLxxW+wlNFeg7csiBWK8EGvdp0qF6MFuBzHkdMVUsfJnHv5RspfXtYBOwJqZk3gGyy0sX5IX4Lr0Fpnx73a0gaKr6DBaBl3jLUWjs8VwycwKoybU4e/Xv2vZMJaAhN9FRCOdMRg++tE9gIp0+j3Ljr7E89i3KNCQ+ll4CmtRc3iUIsQR96q+/NbSCFzL9X7gVrWLR7paIavY1E4Fquc5bCp615ssAd4oh2IVGyt3Y4gylcub6IOsJ9LoeIOgVDEI/asxIzZan2JzjR/7DxzV4NBw0xCAMQrLx+1kM42j8M+gm1BdCGxDbcAcv4c/raD5HHF1CJPvMv5SAK0eNe8pZothufsMSdM3MgaQFBvNPoB2Vadv6/auxmzfP1drEnosKXo79Aag4fhZRTenyOtz68Z4unKPnW3l2gEjBsrUrMV01BxGiVFQjTrkcEX1tfwQjEjJqxkT4RgXm9WATNFvv2IkyUh9BABqlstmIi3OlPUytlBUXubqjXojX5EMffR2JoZRgByd5Vkm6xE952YgryABX2ZEm/DLiuHJo1PSOKYdVqijfXaLAb2VTQq5kBKZ1jjPqiJ1jXXxUlxU8rjwzBijPAkh1PCKKpCruXpYKDw9vbWesfCbnuaFeNxvoQ2xjAmm0eGzl+X6sAPfJJ7KzXWe6ARfVTm9CbBMMf/YfAWo7LZRt6elK1DHp66szFWwRshdJJaq022aLYXMxiBASeTAOodPnuTrII0bYrg1V1m6e/TAksaOoDfv4idf2L9F08+9p33JImP2pSLoUui/mED1tjqrj8FE2WxFIj43Vj6c85aeMCwdBwJCy4Vj6cbHKQ8Zmc8lu6O+842HFNg/0LQGA8WGRpllzjYN512o+MULx0RYcnFw5ZVY4aVIGn/DYStw8Cn51yCBI+twACxdFrm6rtncx1JPxZyGO3CNw01OX97nA5HXwUD28TdSQP7klkYzi0K/omXL+UUxKS7dfEbTzIg453C+qlNKcfRmfkoCWnsrSoZPjNS8zmRwiPO4Rrpo6pVusjn6irdfviqP/x1ixtFg0gYp0pUQFa4WtBStTIGV6NWY6HSAlaE/2GR42ZVcn+vq5vCaE9G+CpYvQ8F46SaNWg2ZvU1PcYEM2uyd2PD1xkWHdRNAajs4BnqNE5mvGcVzqZpNsLbONJgjg8GUzk8MdYHoFKvPzrylA3YxOu7kbPnFKoEH91hObqrePIgZiax8ruxNClD0DqVFKqbBPJ4LJyKTMl7EQK5/1h3nYJurzyO+D9vGBCUA55PjhEwFmVkuYAkb2tPM9bvDmcLzagj6G7Am5oODSfqm8wodM14W0dQ45SdYc255PhDtETcCUFzqr/PrgaidRjMIh6Dkt/csLagCu2+9JwNereLEF5wNxex9K6aOSAFyKepuwNPsAJ2OTEMDq6AGStU9JlXm9ezGtHq5zvZmcEW9D4Ks35PFy0IqjhJ29p1DPWbtKeDyKbKU3gmX+1ICf4+yEbC/tXUCTM1baP8+48Bm+33L5IU/9iLOsoeFSMvLVbBFqptE+1nrdgt0UOL5spPs4ob7UIssAfSj+N298iPx/J77moh8sA+GO2dG9NIwmGfFXMqMT3W6fGaKxZyqHu8kCdKAcOqwxlayxv9c+YxcMqgiwE0jsctbMJQsLEAAAAA==",
    code:"NU-DEMO-001", nick:"ใบตอง", name:"ใบตอง วัฒนกิจ", year:2, faculty:"คณะบริหารธุรกิจ เศรษฐศาสตร์และการสื่อสาร",
    major:"การตลาด", skills:"บริการลูกค้า, งานเอกสาร", interests:[...HappiUM1.SEED_STUDENT_INTERESTS.baitong], availability:"จันทร์ 16:30–21:00, พุธ 16:30–21:00", contact:"baitong@nu.example",
    schedule:[
      {"day":"จันทร์","start":"09:00","end":"10:30","course":"การบัญชีเบื้องต้น","code":"ACC201","room":"QS 2204","section":"1"},
      {"day":"จันทร์","start":"14:30","end":"16:30","course":"หลักการตลาด","code":"MKT201","room":"QS 2305","section":"2"},
      {"day":"อังคาร","start":"08:30","end":"10:30","course":"สถิติธุรกิจ","code":"BUS202","room":"QS 2201","section":"1"},
      {"day":"อังคาร","start":"13:00","end":"15:00","course":"การสื่อสารภาษาอังกฤษ","code":"ENG201","room":"HS 3402","section":"3"},
      {"day":"พุธ","start":"09:00","end":"10:30","course":"การบัญชีเบื้องต้น","code":"ACC201","room":"QS 2204","section":"1"},
      {"day":"พุธ","start":"13:00","end":"15:00","course":"พฤติกรรมผู้บริโภค","code":"MKT214","room":"QS 2306","section":"1"},
      {"day":"พฤหัสบดี","start":"10:00","end":"12:00","course":"การสื่อสารการตลาด","code":"MKT220","room":"QS 2302","section":"2"},
      {"day":"พฤหัสบดี","start":"14:00","end":"15:30","course":"สถิติธุรกิจ","code":"BUS202","room":"QS 2201","section":"1"},
      {"day":"ศุกร์","start":"09:00","end":"11:00","course":"การตลาดดิจิทัล","code":"MKT225","room":"QS LAB 2","section":"1"},
      {"day":"ศุกร์","start":"13:00","end":"14:30","course":"หลักการตลาด","code":"MKT201","room":"QS 2305","section":"2"}
    ]
  },
  thanwa: {
    photo:"data:image/webp;base64,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",
    code:"NU-DEMO-002", nick:"ธันวา", name:"ธันวา พราวพงศ์", year:3, faculty:"คณะวิทยาศาสตร์",
    major:"วิทยาการคอมพิวเตอร์", skills:"บริการลูกค้า, จัดการข้อมูล, Google Sheets, คีย์ข้อมูล, พิมพ์เอกสาร, แก้ปัญหาคอมพิวเตอร์", interests:[...HappiUM1.SEED_STUDENT_INTERESTS.thanwa], availability:"จันทร์ 15:00–21:00, เสาร์ 08:00–20:00", contact:"thanwa@nu.example",
    schedule:[
      {"day":"จันทร์","start":"09:00","end":"11:00","course":"โครงสร้างข้อมูล","code":"CS311","room":"SC 2102","section":"1"},
      {"day":"จันทร์","start":"13:00","end":"15:00","course":"ฐานข้อมูล","code":"CS312","room":"SC 2204","section":"2"},
      {"day":"อังคาร","start":"10:00","end":"12:00","course":"ระบบปฏิบัติการ","code":"CS320","room":"SC 2305","section":"1"},
      {"day":"อังคาร","start":"13:30","end":"15:30","course":"การสื่อสารข้อมูล","code":"CS325","room":"SC 2103","section":"1"},
      {"day":"พุธ","start":"08:30","end":"10:30","course":"การพัฒนาเว็บ","code":"CS330","room":"SC LAB 3","section":"2"},
      {"day":"พุธ","start":"13:00","end":"15:00","course":"โครงสร้างข้อมูล","code":"CS311","room":"SC 2102","section":"1"},
      {"day":"พุธ","start":"17:00","end":"18:30","course":"ปฏิบัติการเขียนโปรแกรม","code":"CS318","room":"SC LAB 2","section":"3"},
      {"day":"พฤหัสบดี","start":"09:00","end":"11:00","course":"คณิตศาสตร์ดิสครีต","code":"MTH305","room":"SC 2401","section":"2"},
      {"day":"พฤหัสบดี","start":"13:00","end":"15:00","course":"ระบบปฏิบัติการ","code":"CS320","room":"SC 2305","section":"1"},
      {"day":"ศุกร์","start":"10:00","end":"12:00","course":"ฐานข้อมูล","code":"CS312","room":"SC 2204","section":"2"}
    ]
  },
  pim: {
    photo:"data:image/webp;base64,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",
    code:"NU-DEMO-003", nick:"พิม", name:"พิมพ์ พิชญกุล", year:1, faculty:"คณะมนุษยศาสตร์",
    major:"ภาษาอังกฤษ", skills:"ภาษาอังกฤษ, จัดหนังสือ", interests:[...HappiUM1.SEED_STUDENT_INTERESTS.pim], availability:"อังคาร 15:00–21:00, พุธ 11:00–21:00", contact:"pim@nu.example",
    schedule:[
      {"day":"จันทร์","start":"09:00","end":"10:30","course":"ไวยากรณ์ภาษาอังกฤษ","code":"ENG104","room":"HS 3105","section":"1"},
      {"day":"จันทร์","start":"13:00","end":"15:00","course":"สังคมและวัฒนธรรม","code":"GE115","room":"QS 1203","section":"4"},
      {"day":"อังคาร","start":"09:30","end":"11:30","course":"การเขียนภาษาอังกฤษ","code":"ENG110","room":"HS 3202","section":"1"},
      {"day":"อังคาร","start":"13:00","end":"15:00","course":"ภาษาอังกฤษเพื่อการสื่อสาร","code":"ENG101","room":"HS 3303","section":"2"},
      {"day":"พุธ","start":"09:00","end":"11:00","course":"ทักษะการอ่านภาษาอังกฤษ","code":"ENG103","room":"HS 3304","section":"2"},
      {"day":"พุธ","start":"13:30","end":"15:00","course":"ภาษาและวัฒนธรรม","code":"ENG121","room":"HS 3103","section":"1"},
      {"day":"พฤหัสบดี","start":"08:30","end":"10:30","course":"การรู้เท่าทันสื่อดิจิทัล","code":"GE112","room":"QS 1301","section":"5"},
      {"day":"พฤหัสบดี","start":"13:00","end":"15:00","course":"การเขียนภาษาอังกฤษ","code":"ENG110","room":"HS 3202","section":"1"},
      {"day":"ศุกร์","start":"10:00","end":"12:00","course":"ไวยากรณ์ภาษาอังกฤษ","code":"ENG104","room":"HS 3105","section":"1"},
      {"day":"ศุกร์","start":"13:00","end":"15:00","course":"ภาษาอังกฤษเพื่อการสื่อสาร","code":"ENG101","room":"HS 3303","section":"2"}
    ]
  }
};
const profileFields = {nick:"ชื่อเล่น",intro:"แนะนำตัว",skills:"ทักษะ",experience:"ประสบการณ์",photo:"รูปโปรไฟล์"};
function applicationProfile(student, shared = []) {
  const {name, major, year} = student;
  return {name, major, year,
    ...Object.fromEntries(shared.filter(key => Object.hasOwn(profileFields,key) && student[key]).map(key=>[key,student[key]]))};
}
function validPhoto(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  return (
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ||
    /^\/(?:uploads|api\/uploads)\/[A-Za-z0-9._\-\/]+$/.test(value)
  );
}
function studentAvatar(student, label = "") {
  if (validPhoto(student.photo)) {
    return '<img class="student-avatar avatar-photo" src="' + html(student.photo) + '" alt="' + html(label) + '">';
  }
  return '<span class="student-avatar" aria-hidden="true">' +
    html(student.nick || student.name.split(" ")[0]) + '</span>';
}
function applicationProfileDetails(profile) {
  const fields = Object.entries(profileFields)
    .filter(([key])=>key!=="photo" && profile[key]).map(([key,label])=>[label,profile[key]]);
  return (validPhoto(profile.photo) ? '<img class="profile-photo" src="' + html(profile.photo) + '" alt="รูปโปรไฟล์">' : "") +
    dataList([["สาขา",profile.major],["ชั้นปี",profile.year],...fields]);
}


const addedEmployers = {
  pawstay:{"name":"บ้านอุ้งเท้า รับฝากสัตว์","type":"near","contact":"pawstay@example.com","status":"verified","reason":""},
  petcorner:{"name":"เพ็ทคอร์เนอร์ มน.","type":"near","contact":"petcorner@example.com","status":"verified","reason":""},
  campusmart:{"name":"มินิมาร์ตประตู 5","type":"near","contact":"campusmart@example.com","status":"verified","reason":""},
  campusstudio:{"name":"สตูดิโอแคมปัส","type":"near","contact":"campusstudio@example.com","status":"verified","reason":""},
  learnroom:{"name":"ห้องเรียนหลังเลิกเรียน","type":"near","contact":"learnroom@example.com","status":"verified","reason":""},

  sports:{name:"ศูนย์กีฬา มน.", type:"campus", contact:"sports@nu.example", status:"verified", reason:""},
  copyshop:{name:"ร้านถ่ายเอกสารประตู 5", type:"near", contact:"copyshop@example.com", status:"verified", reason:""},
  activities:{name:"หน่วยกิจกรรมนิสิต มน.", type:"campus", contact:"activities@nu.example", status:"pending", reason:""}
};

const extraDemoJobs = [
  {"id":"demo-walk-dogs","employer":"pawstay","title":"ผู้ช่วยพาสุนัขเดินเล่น","kind":"near","category":"ดูแลสัตว์เลี้ยง","location":"บ้านอุ้งเท้า ใกล้ประตู 4","payType":"hourly","rate":90,"distance":1.1,"status":"live","deadline":"20 ธ.ค. 2569","doc":false,"description":"พาสุนัขเดินเล่นตามรอบ เช็กสายจูง และรายงานความเรียบร้อยให้เจ้าของร้าน","skills":"ดูแลสัตว์เลี้ยง, พาสุนัขเดินเล่น","shifts":[{"id":"NEW-01","day":"เสาร์","start":"08:00","end":"10:30","capacity":2}]},
  {"id":"demo-pet-sitter","employer":"pawstay","title":"ผู้ช่วยดูแลสุนัขและแมว","kind":"near","category":"ดูแลสัตว์เลี้ยง","location":"บ้านอุ้งเท้า ใกล้ประตู 4","payType":"hourly","rate":80,"distance":1.1,"status":"live","deadline":"20 ธ.ค. 2569","doc":false,"description":"เติมน้ำและอาหารตามตาราง จัดพื้นที่พักสัตว์ และบันทึกกิจวัตรให้เจ้าของ","skills":"ดูแลสัตว์เลี้ยง, ทำงานละเอียด","shifts":[{"id":"NEW-02","day":"พุธ","start":"17:00","end":"20:00","capacity":2}]},
  {"id":"demo-pet-supplies","employer":"petcorner","title":"ผู้ช่วยร้านอุปกรณ์สัตว์เลี้ยง","kind":"near","category":"ดูแลสัตว์เลี้ยง","location":"เพ็ทคอร์เนอร์ หน้ามอ","payType":"hourly","rate":75,"distance":1.1,"status":"live","deadline":"20 ธ.ค. 2569","doc":false,"description":"จัดสินค้าและตอบคำถามทั่วไปเรื่องอุปกรณ์สัตว์เลี้ยง โดยมีพนักงานประจำคอยช่วย","skills":"บริการลูกค้า, จัดสต็อก","shifts":[{"id":"NEW-03","day":"อังคาร","start":"17:00","end":"20:00","capacity":2}]},
  {"id":"demo-pet-media","employer":"petcorner","title":"ผู้ช่วยถ่ายภาพสินค้าเพ็ทช็อป","kind":"near","category":"การตลาดและสื่อ","location":"เพ็ทคอร์เนอร์ หน้ามอ","payType":"hourly","rate":85,"distance":1.1,"status":"live","deadline":"20 ธ.ค. 2569","doc":false,"description":"ถ่ายรูปอุปกรณ์สัตว์เลี้ยงและเตรียมภาพสำหรับโพสต์ร้าน","skills":"ถ่ายภาพ, Canva","shifts":[{"id":"NEW-04","day":"อาทิตย์","start":"10:00","end":"13:00","capacity":2}]},
  {"id":"demo-shelf-stock","employer":"campusmart","title":"ผู้ช่วยเติมสินค้าและเช็กสต็อก","kind":"near","category":"ค้าปลีกและสต็อก","location":"มินิมาร์ตประตู 5","payType":"hourly","rate":70,"distance":1.1,"status":"live","deadline":"20 ธ.ค. 2569","doc":false,"description":"ตรวจจำนวนสินค้า จัดชั้น และแจ้งรายการที่ต้องเติม","skills":"จัดสต็อก, ทำงานละเอียด","shifts":[{"id":"NEW-05","day":"พฤหัสบดี","start":"17:00","end":"20:00","capacity":2}]},
  {"id":"demo-shop-pack","employer":"campusmart","title":"ผู้ช่วยแพ็กออเดอร์ร้านค้า","kind":"near","category":"ค้าปลีกและสต็อก","location":"มินิมาร์ตประตู 5","payType":"hourly","rate":72,"distance":1.1,"status":"live","deadline":"20 ธ.ค. 2569","doc":false,"description":"เช็กรายการและแพ็กสินค้าตามใบสั่งซื้อก่อนส่งมอบ","skills":"แพ็กสินค้า, ทำงานละเอียด","shifts":[{"id":"NEW-06","day":"ศุกร์","start":"17:00","end":"20:00","capacity":2}]},
  {"id":"demo-mart-cashier","employer":"campusmart","title":"ผู้ช่วยแคชเชียร์ช่วงเย็น","kind":"near","category":"บริการลูกค้า","location":"มินิมาร์ตประตู 5","payType":"hourly","rate":75,"distance":1.1,"status":"live","deadline":"20 ธ.ค. 2569","doc":false,"description":"รับชำระเงิน ตรวจใบเสร็จ และช่วยลูกค้าหาสินค้า","skills":"บริการลูกค้า, ทำงานละเอียด","shifts":[{"id":"NEW-07","day":"อาทิตย์","start":"17:00","end":"20:00","capacity":2}]},
  {"id":"demo-video-captions","employer":"campusstudio","title":"ผู้ช่วยทำซับคลิปสั้น","kind":"online","category":"การตลาดและสื่อ","location":"ทำงานออนไลน์","payType":"hourly","rate":95,"distance":0,"status":"live","deadline":"20 ธ.ค. 2569","doc":false,"description":"ฟังคลิปสั้น ตรวจการสะกด และใส่คำบรรยายตามเทมเพลต","skills":"พิมพ์เอกสาร, ตัดต่อวิดีโอ","shifts":[{"id":"NEW-08","day":"ศุกร์","start":"18:00","end":"20:00","capacity":2}]},
  {"id":"demo-event-photo","employer":"campusstudio","title":"ผู้ช่วยถ่ายภาพกิจกรรม","kind":"campus","category":"อีเวนต์","location":"ลานกิจกรรม มน.","payType":"hourly","rate":100,"distance":0.6,"status":"live","deadline":"20 ธ.ค. 2569","doc":false,"description":"ช่วยถ่ายภาพช่วงลงทะเบียนและคัดภาพให้ทีมงานหลังจบกิจกรรม","skills":"ถ่ายภาพ, ประสานงาน","shifts":[{"id":"NEW-09","day":"อาทิตย์","start":"14:00","end":"17:00","capacity":2}]},
  {"id":"demo-worksheet","employer":"learnroom","title":"ผู้ช่วยทำใบงานคณิต","kind":"online","category":"สอนและการศึกษา","location":"ทำงานออนไลน์","payType":"hourly","rate":90,"distance":0,"status":"live","deadline":"20 ธ.ค. 2569","doc":false,"description":"จัดหน้าใบงานและตรวจเฉลยตามต้นฉบับที่ผู้สอนเตรียมไว้","skills":"จัดเอกสาร, ทำงานละเอียด","shifts":[{"id":"NEW-10","day":"พฤหัสบดี","start":"18:00","end":"20:00","capacity":2}]},
  {"id":"demo-homework","employer":"learnroom","title":"ผู้ช่วยดูแลการบ้านเด็กประถม","kind":"near","category":"สอนและการศึกษา","location":"ห้องเรียนใกล้ประตูหลัก มน.","payType":"hourly","rate":95,"distance":1.1,"status":"live","deadline":"20 ธ.ค. 2569","doc":false,"description":"ช่วยทบทวนการบ้านและดูแลการทำแบบฝึก โดยมีผู้สอนประจำอยู่ด้วย","skills":"สอนเด็ก, ประสานงาน","shifts":[{"id":"NEW-11","day":"อังคาร","start":"17:00","end":"19:00","capacity":2}]},
  {"id":"demo-learning-materials","employer":"learnroom","title":"ผู้ช่วยจัดชุดแบบฝึกและสื่อการสอน","kind":"near","category":"สอนและการศึกษา","location":"ห้องเรียนใกล้ประตูหลัก มน.","payType":"hourly","rate":72,"distance":1.1,"status":"live","deadline":"20 ธ.ค. 2569","doc":false,"description":"พิมพ์ ตัด และจัดชุดแบบฝึกตามจำนวนผู้เรียนแต่ละรอบ","skills":"จัดเอกสาร, ทำงานละเอียด","shifts":[{"id":"NEW-12","day":"อาทิตย์","start":"13:00","end":"16:00","capacity":2}]},

  {id:"demo-office-excel", employer:"library", title:"ผู้ช่วยงานเอกสาร", kind:"campus", category:"งานเอกสาร",
   location:"ห้องสมุด มน.", payType:"hourly", rate:75, distance:0.4, status:"live", deadline:"20 ธ.ค. 2569", doc:false,
   description:"จัดทำเอกสารและบันทึกข้อมูลใน Excel", requiredSkills:"คีย์ข้อมูล", skills:"Excel พื้นฐาน, จัดแฟ้ม",
   shifts:[{id:"DE-01",day:"จันทร์",start:"17:00",end:"20:00",capacity:2}]},
  {id:"demo-it-support", employer:"library", title:"ผู้ช่วย IT Support", kind:"campus", category:"เทคโนโลยีและไอที",
   location:"ห้องสมุด มน.", payType:"hourly", rate:85, distance:0.4, status:"live", deadline:"20 ธ.ค. 2569", doc:false,
   description:"ช่วยตรวจคอมพิวเตอร์และแก้ปัญหาการใช้งานเบื้องต้น", skills:"แก้ปัญหาคอมพิวเตอร์",
   shifts:[{id:"IT-01",day:"เสาร์",start:"09:00",end:"12:00",capacity:2}]},
  {
    id:"demo-sports-frontdesk", employer:"sports", title:"ผู้ช่วยจุดบริการสนามกีฬา",
    kind:"campus", category:"บริการลูกค้า", location:"เคาน์เตอร์ศูนย์กีฬา มน.",
    payType:"hourly", rate:72, distance:0.7, status:"live", deadline:"16 ธ.ค. 2569", doc:false,
    description:"ตอบคำถามเรื่องเวลาใช้สนามและช่วยเช็กคิวจอง", skills:"สื่อสาร, บริการลูกค้า",
    shifts:[{id:"SF-01",day:"จันทร์",start:"17:00",end:"20:00",capacity:2}]
  },
  {
    id:"demo-library-returns", employer:"library", title:"ผู้ช่วยคัดแยกหนังสือรับคืน",
    kind:"campus", category:"งานในมหาวิทยาลัย", location:"จุดรับคืนหนังสือ มน.",
    payType:"hourly", rate:68, distance:0.4, status:"live", deadline:"17 ธ.ค. 2569", doc:false,
    description:"สแกนหนังสือรับคืนและคัดแยกตามหมวดก่อนส่งขึ้นชั้น", skills:"จัดหนังสือ, ทำงานละเอียด",
    shifts:[{id:"LR-01",day:"อังคาร",start:"17:00",end:"19:00",capacity:3}]
  },
  {
    id:"demo-sports-race", employer:"sports", title:"ทีมลงทะเบียนกิจกรรมวิ่ง",
    kind:"campus", category:"อีเวนต์", location:"จุดรวมพลสนามกีฬา มน.",
    payType:"hourly", rate:85, distance:0.7, status:"live", deadline:"18 ธ.ค. 2569", doc:false,
    description:"แจกหมายเลขวิ่ง ตรวจรายชื่อ และบอกทางไปจุดปล่อยตัว", skills:"ประสานงาน, สื่อสาร",
    shifts:[{id:"SR-01",day:"อาทิตย์",start:"06:00",end:"09:00",capacity:4}]
  },
  {
    id:"demo-library-exhibit", employer:"library", title:"ผู้ช่วยติดตั้งนิทรรศการหนังสือ",
    kind:"campus", category:"อีเวนต์", location:"โถงนิทรรศการหอสมุด มน.",
    payType:"hourly", rate:78, distance:0.4, status:"live", deadline:"19 ธ.ค. 2569", doc:false,
    description:"จัดวางหนังสือ ป้ายคำอธิบาย และอุปกรณ์สำหรับนิทรรศการ", skills:"จัดพื้นที่, ทำงานเป็นทีม",
    shifts:[{id:"LE-01",day:"ศุกร์",start:"16:30",end:"19:00",capacity:3}]
  },
  {
    id:"demo-cafe-prep", employer:"cafe", title:"ผู้ช่วยเตรียมเครื่องดื่มช่วงเย็น",
    kind:"near", category:"ร้านอาหารและกาแฟ", location:"ร้านกาแฟหน้ามอ",
    payType:"hourly", rate:75, distance:1.2, status:"live", deadline:"16 ธ.ค. 2569", doc:false,
    description:"จัดเตรียมวัตถุดิบและทำเครื่องดื่มตามรายการที่บาริสต้ามอบหมาย", skills:"เตรียมวัตถุดิบ, ทำงานเป็นทีม",
    shifts:[{id:"CB-01",day:"อังคาร",start:"17:00",end:"20:00",capacity:2}]
  },
  {
    id:"demo-cafe-stock", employer:"cafe", title:"ผู้ช่วยนับสต็อกและจัดชั้นสินค้า",
    kind:"near", category:"ร้านอาหารและกาแฟ", location:"ร้านกาแฟหน้ามอ",
    payType:"hourly", rate:70, distance:1.2, status:"live", deadline:"17 ธ.ค. 2569", doc:false,
    description:"นับแก้วและวัตถุดิบ พร้อมบันทึกรายการที่ใกล้หมด", skills:"จัดการข้อมูล, ทำงานละเอียด",
    shifts:[{id:"CS-01",day:"อาทิตย์",start:"16:00",end:"19:00",capacity:1}]
  },
  {
    id:"demo-copyshop-binding", employer:"copyshop", title:"ผู้ช่วยเข้าเล่มรายงาน",
    kind:"near", category:"งานเอกสาร", location:"ร้านถ่ายเอกสารประตู 5",
    payType:"hourly", rate:72, distance:1, status:"live", deadline:"18 ธ.ค. 2569", doc:false,
    description:"เรียงหน้า เจาะรู และเข้าเล่มรายงานตามใบสั่งงาน", skills:"จัดเอกสาร, ทำงานละเอียด",
    shifts:[{id:"PB-01",day:"พฤหัสบดี",start:"17:00",end:"20:00",capacity:2}]
  },
  {
    id:"demo-copyshop-packing", employer:"copyshop", title:"ผู้ช่วยแพ็กชุดเอกสารประชุม",
    kind:"near", category:"งานเอกสาร", location:"ร้านถ่ายเอกสารประตู 5",
    payType:"hourly", rate:66, distance:1, status:"live", deadline:"19 ธ.ค. 2569", doc:false,
    description:"ตรวจจำนวนหน้า แยกตามชุด และติดป้ายชื่อสำหรับส่งมอบ", skills:"จัดเอกสาร, ทำงานละเอียด",
    shifts:[{id:"PP-01",day:"เสาร์",start:"10:00",end:"13:00",capacity:3}]
  },
  {
    id:"demo-library-data", employer:"library", title:"ผู้ช่วยจัดข้อมูลรายการหนังสือ",
    kind:"online", category:"งานเอกสาร", location:"ทำงานออนไลน์",
    payType:"hourly", rate:90, distance:0, status:"live", deadline:"16 ธ.ค. 2569", doc:false,
    description:"ตรวจชื่อเรื่องและจัดหมวดหมู่รายการหนังสือในสเปรดชีต", skills:"สเปรดชีต, จัดการข้อมูล",
    shifts:[{id:"LD-01",day:"พุธ",start:"18:00",end:"20:00",capacity:2}]
  },
  {
    id:"demo-sports-design", employer:"sports", title:"ผู้ช่วยออกแบบโปสเตอร์กีฬา",
    kind:"online", category:"การตลาดและสื่อ", location:"ทำงานออนไลน์",
    payType:"hourly", rate:95, distance:0, status:"live", deadline:"17 ธ.ค. 2569", doc:false,
    description:"จัดวางภาพและกำหนดการแข่งขันในเทมเพลตพร้อมส่งตรวจ", skills:"Canva, ออกแบบกราฟิก",
    shifts:[{id:"SD-01",day:"เสาร์",start:"13:00",end:"16:00",capacity:2}]
  },
  {
    id:"demo-cafe-menu", employer:"cafe", title:"ผู้ช่วยอัปเดตเมนูออนไลน์",
    kind:"online", category:"การตลาดและสื่อ", location:"ทำงานออนไลน์",
    payType:"hourly", rate:80, distance:0, status:"live", deadline:"18 ธ.ค. 2569", doc:false,
    description:"ตรวจรายการ ราคา และคำอธิบายเมนูก่อนอัปเดต", skills:"เขียนข้อความ, ทำงานละเอียด",
    shifts:[{id:"CM-01",day:"ศุกร์",start:"18:00",end:"20:00",capacity:1}]
  },
  {
    id:"demo-copyshop-check", employer:"copyshop", title:"ผู้ช่วยตรวจไฟล์ก่อนพิมพ์",
    kind:"online", category:"งานเอกสาร", location:"ทำงานออนไลน์",
    payType:"hourly", rate:85, distance:0, status:"live", deadline:"20 ธ.ค. 2569", doc:false,
    description:"ตรวจขนาดกระดาษ ลำดับหน้า และชื่อไฟล์ก่อนส่งเข้าคิวพิมพ์", skills:"PDF, จัดเอกสาร",
    shifts:[{id:"PF-01",day:"อาทิตย์",start:"18:00",end:"20:00",capacity:2}]
  },
  {
    id:"demo-sports-equipment", employer:"sports", title:"ผู้ช่วยดูแลอุปกรณ์กีฬา",
    kind:"campus", category:"งานในมหาวิทยาลัย", location:"ศูนย์กีฬา มน.",
    payType:"hourly", rate:70, distance:0.7, status:"live",
    description:"รับคืนอุปกรณ์ ตรวจสภาพ และจัดเก็บเข้าที่",
    skills:"จัดอุปกรณ์, บริการลูกค้า", deadline:"14 ธ.ค. 2569", doc:false,
    shifts:[{id:"SP-01",day:"อังคาร",start:"17:00",end:"20:00",capacity:2}]
  },
  {
    id:"demo-copyshop-counter", employer:"copyshop", title:"ผู้ช่วยร้านถ่ายเอกสาร",
    kind:"near", category:"บริการลูกค้า", location:"หน้าประตู 5 มหาวิทยาลัย",
    payType:"hourly", rate:65, distance:1, status:"live",
    description:"รับไฟล์ พิมพ์เอกสาร และจัดชุดก่อนส่งให้ลูกค้า",
    skills:"งานเอกสาร, บริการลูกค้า", deadline:"15 ธ.ค. 2569", doc:false,
    shifts:[{id:"CP-01",day:"พุธ",start:"16:30",end:"19:30",capacity:2}]
  },
  {
    id:"demo-activities-checkin", employer:"activities", title:"ผู้ช่วยลงทะเบียนกิจกรรมนิสิต",
    kind:"campus", category:"อีเวนต์", location:"อาคารกิจกรรมนิสิต มน.",
    payType:"hourly", rate:80, distance:0.5, status:"review",
    description:"เช็กรายชื่อ แจกบัตรเข้าร่วม และประสานงานจุดลงทะเบียน",
    skills:"ประสานงาน, งานเอกสาร", deadline:"16 ธ.ค. 2569", doc:false,
    shifts:[{id:"AC-01",day:"เสาร์",start:"13:00",end:"17:00",capacity:3}]
  },
  {
    id:"demo-coffee-orders", employer:"cafe", title:"ผู้ช่วยแพ็กออเดอร์ร้านกาแฟ",
    kind:"near", category:"ร้านอาหารและกาแฟ", location:"ร้านกาแฟหน้ามอ",
    payType:"hourly", rate:65, distance:1.2, status:"live",
    description:"เช็กรายการเครื่องดื่ม แพ็กออเดอร์ และส่งให้ลูกค้าหรือไรเดอร์",
    skills:"บริการลูกค้า, ทำงานละเอียด", deadline:"12 ธ.ค. 2569", doc:false,
    shifts:[{id:"CO-01",day:"ศุกร์",start:"16:30",end:"19:00",capacity:2}]
  },
  {
    id:"demo-library-welcome", employer:"library", title:"ผู้ช่วยลงทะเบียนกิจกรรมห้องสมุด",
    kind:"campus", category:"อีเวนต์", location:"โถงกิจกรรมห้องสมุด มน.",
    payType:"hourly", rate:75, distance:0.4, status:"live",
    description:"เช็กรายชื่อผู้เข้าร่วม แจกป้ายชื่อ และช่วยบอกทางภายในงาน",
    skills:"ประสานงาน, บริการลูกค้า", deadline:"10 ธ.ค. 2569", doc:false,
    shifts:[{id:"LW-01",day:"เสาร์",start:"09:00",end:"12:00",capacity:3}]
  },
  {
    id:"demo-library-media", employer:"library", title:"ผู้ช่วยทำสื่อประชาสัมพันธ์ออนไลน์",
    kind:"online", category:"การตลาดและสื่อ", location:"ทำงานออนไลน์",
    payType:"hourly", rate:90, distance:0, status:"live",
    description:"จัดทำภาพประกาศกิจกรรมจากเทมเพลตและตรวจข้อความก่อนส่งให้ผู้ประสานงาน",
    skills:"Canva, การตลาด, เขียนข้อความ", deadline:"14 ธ.ค. 2569", doc:false,
    shifts:[{id:"LM-01",day:"พฤหัสบดี",start:"18:00",end:"20:00",capacity:2}]
  }
];

function fresh() {
  return {
    signedIn:false,
    studentId:firstStudent,
    students:structuredClone(studentFixtures),
    employers:{
      cafe:{name:"ร้านกาแฟหน้ามอ", type:"near", contact:"cafe@example.com", status:"verified", reason:""},
      library:{name:"หน่วยงานห้องสมุด", type:"campus", contact:"library@example.com", status:"verified", reason:""},
      ...structuredClone(addedEmployers)
    },
    jobs:[
      ...structuredClone(extraDemoJobs),
      {id:"cafe", employer:"cafe", title:"พนักงานร้านกาแฟ", kind:"near", category:"ร้านอาหารและกาแฟ", location:"หน้ามหาวิทยาลัย", payType:"hourly", rate:60, distance:1.2, status:"live", description:"ช่วยรับออเดอร์ เสิร์ฟเครื่องดื่ม และดูแลพื้นที่หน้าร้าน", skills:"บริการลูกค้า", deadline:"30 พ.ย. 2569", doc:false,
       shifts:[{id:"CF-01",day:"จันทร์",start:"17:00",end:"20:00",capacity:2},{id:"CF-02",day:"จันทร์",start:"15:30",end:"18:30",capacity:1}]},
      {id:"library", employer:"library", title:"ผู้ช่วยงานห้องสมุด", kind:"campus", category:"งานในมหาวิทยาลัย", location:"ห้องสมุด มน.", payType:"hourly", rate:70, distance:0.4, status:"live", description:"จัดหนังสือและช่วยแนะนำการใช้พื้นที่อ่านหนังสือ", skills:"งานเอกสาร", deadline:"30 พ.ย. 2569", doc:true,
       shifts:[{id:"LB-01",day:"พุธ",start:"17:00",end:"20:00",capacity:2}]},
      {id:"event", employer:"cafe", title:"ผู้ช่วยจัดบูธเครื่องดื่ม", kind:"near", category:"อีเวนต์", location:"หน้ามหาวิทยาลัย", payType:"hourly", rate:65, distance:1.2, status:"review", description:"จัดเตรียมบูธ ดูแลคิว และเก็บอุปกรณ์หลังงาน", skills:"ประสานงาน", deadline:"30 พ.ย. 2569", doc:false,
       shifts:[{id:"EV-01",day:"พุธ",start:"17:00",end:"20:00",capacity:2}]},
      structuredClone(HappiUM2.SEED_FIXED_JOB)
    ],
    applications:[
      {id:"demo-baitong-library",student:firstStudent,job:"library",status:"pending",profile:applicationProfile(studentFixtures.baitong),doc:"เอกสารตัวอย่าง.pdf",studentReview:null,employerReview:null},
      {id:"demo-thanwa-cafe",student:"thanwa",job:"cafe",shift:"CF-01",status:"offered",profile:applicationProfile(studentFixtures.thanwa),doc:"",studentReview:null,employerReview:null},
      {id:"demo-pim-library",student:"pim",job:"library",shift:"LB-01",status:"accepted",profile:applicationProfile(studentFixtures.pim),doc:"เอกสารตัวอย่าง.pdf",work:"approved",in:"17:00",out:"20:00",amount:210,studentReview:null,employerReview:null}
    ],
    tutors:structuredClone(tutorFixtures),
    skillMatchingVersion:1,
    reports:[]
  };
}
const tutorFormats = {online:"ออนไลน์",inPerson:"พบตัว",both:"ออนไลน์และพบตัว"};
const tutorLevels = ["ประถมศึกษา","มัธยมศึกษา","มหาวิทยาลัย","บุคคลทั่วไป"];
const tutorSubjects = {
  language:{label:"ภาษา",icon:"books"},
  math:{label:"คณิตศาสตร์",icon:"grid"},
  science:{label:"วิทยาศาสตร์",icon:"campus"},
  tech:{label:"คอมพิวเตอร์และดิจิทัล",icon:"screen"},
  creative:{label:"ศิลปะและการออกแบบ",icon:"event"},
  exam:{label:"เตรียมสอบและทักษะการเรียน",icon:"books"},
  other:{label:"วิชาอื่น ๆ",icon:"books"}
};
const tutorFixtures = [
  {id:"tutor-demo-code", owner:"thanwa", category:"tech", subject:"Python เบื้องต้น", level:"บุคคลทั่วไป", rate:180,
    format:"online", availability:"เสาร์ 14:00–17:00", experience:"นิสิตวิทยาการคอมพิวเตอร์ มน. สอนเขียนโปรแกรมจากโจทย์ง่าย ๆ", requests:[]},
  {id:"tutor-demo-english", owner:"pim", category:"language", subject:"ภาษาอังกฤษเพื่อการสนทนา", level:"มัธยมศึกษา", rate:150,
    format:"both", availability:"พุธ 16:00–20:00", experience:"ฝึกถามตอบและสื่อสารผ่านสถานการณ์ในชีวิตประจำวัน", requests:[]},
  {"id":"tutor-demo-math","owner":"thanwa","subject":"คณิตศาสตร์ ม.ต้น","category":"math","level":"มัธยมศึกษา","rate":170,"format":"both","availability":"เสาร์ 10:00–12:00","experience":"ปูพื้นสมการ เศษส่วน และโจทย์ปัญหาจากแบบฝึกทีละขั้น","requests":[]},
  {"id":"tutor-demo-math-primary","owner":"baitong","subject":"คณิตคิดสนุก ป.4–ป.6","category":"math","level":"ประถมศึกษา","rate":130,"format":"inPerson","availability":"อาทิตย์ 09:00–12:00","experience":"ใช้ภาพและเกมฝึกคิดเลข เศษส่วน และการอ่านโจทย์","requests":[]},
  {"id":"tutor-demo-science","owner":"thanwa","subject":"วิทยาศาสตร์ ม.ต้น","category":"science","level":"มัธยมศึกษา","rate":160,"format":"online","availability":"เสาร์ 16:00–18:00","experience":"สรุปแรง พลังงาน และไฟฟ้าพร้อมทดลองง่าย ๆ","requests":[]},
  {"id":"tutor-demo-physics","owner":"thanwa","subject":"ฟิสิกส์พื้นฐาน ม.ปลาย","category":"science","level":"มัธยมศึกษา","rate":200,"format":"online","availability":"อาทิตย์ 14:00–17:00","experience":"วาดแผนภาพแรงก่อนลงสมการ แล้วฝึกโจทย์ตามบท","requests":[]},
  {"id":"tutor-demo-english-reading","owner":"pim","subject":"ภาษาอังกฤษอ่านออกเสียง ป.4–ป.6","category":"language","level":"ประถมศึกษา","rate":140,"format":"inPerson","availability":"เสาร์ 09:00–12:00","experience":"ฝึกเสียงตัวอักษร อ่านคำ และอ่านประโยคสั้น ๆ","requests":[]},
  {"id":"tutor-demo-thai-writing","owner":"pim","subject":"ภาษาไทยและการเขียนเรียงความ","category":"language","level":"มัธยมศึกษา","rate":150,"format":"online","availability":"พฤหัสบดี 17:00–19:00","experience":"ฝึกวางโครงเรื่อง เขียนย่อหน้า และตรวจคำผิดจากงานของผู้เรียน","requests":[]},
  {"id":"tutor-demo-excel","owner":"thanwa","subject":"Excel สำหรับงานและการเรียน","category":"tech","level":"บุคคลทั่วไป","rate":190,"format":"both","availability":"อาทิตย์ 10:00–12:00","experience":"สร้างตาราง ใช้สูตรพื้นฐาน และฝึกทำรายงานสรุปจากข้อมูลตัวอย่าง","requests":[]},
  {"id":"tutor-demo-web","owner":"thanwa","subject":"สร้างเว็บด้วย HTML และ CSS","category":"tech","level":"มหาวิทยาลัย","rate":220,"format":"online","availability":"จันทร์ 18:00–20:00","experience":"ลงมือทำหน้าเว็บ 1 หน้า เรียนโครงสร้าง HTML และการจัดวางให้รองรับมือถือ","requests":[]},
  {"id":"tutor-demo-canva","owner":"baitong","subject":"ออกแบบสไลด์ด้วย Canva","category":"creative","level":"บุคคลทั่วไป","rate":160,"format":"online","availability":"อังคาร 18:00–20:00","experience":"ฝึกจัดวางสไลด์ เลือกฟอนต์และสี แล้วทำงานนำเสนอจากหัวข้อของผู้เรียน","requests":[]},
  {"id":"tutor-demo-poster","owner":"baitong","subject":"ออกแบบโปสเตอร์กิจกรรม","category":"creative","level":"มัธยมศึกษา","rate":170,"format":"both","availability":"เสาร์ 13:00–16:00","experience":"เริ่มจากกำหนดลำดับข้อความและลงมือทำโปสเตอร์สำหรับกิจกรรม","requests":[]},
  {"id":"tutor-demo-tgat","owner":"pim","subject":"เตรียมสอบ TGAT ภาษาอังกฤษ","category":"exam","level":"มัธยมศึกษา","rate":200,"format":"online","availability":"อาทิตย์ 13:00–16:00","experience":"ฝึกอ่านบทสนทนา จับใจความ และทำโจทย์แบบจับเวลา","requests":[]},
  {"id":"tutor-demo-presentation","owner":"baitong","subject":"ฝึกพูดนำเสนอหน้าชั้น","category":"exam","level":"มหาวิทยาลัย","rate":180,"format":"both","availability":"พุธ 17:00–19:00","experience":"ซ้อมพูดจากสไลด์จริงและรับคำแนะนำเรื่องการเล่าและตอบคำถาม","requests":[]},
];
const tutorPages = {tutors:tutorDirectory,"tutor-detail":tutorDetail,"tutor-editor":tutorEditor};
const canPostTutor = () => state.signedIn && role === "student";
const tutorBy = id => state.tutors.find(tutor => tutor.id === id);
const tutorOwner = tutor => state.students[tutor.owner]?.name || "นิสิต มน.";
const tutorCategory = tutor => Object.hasOwn(tutorSubjects,tutor.category) ? tutor.category : "other";


const knownTutorPhotos = new Set([
  "tutor-demo-code","tutor-demo-english","tutor-demo-math","tutor-demo-math-primary",
  "tutor-demo-science","tutor-demo-physics","tutor-demo-english-reading","tutor-demo-thai-writing",
  "tutor-demo-excel","tutor-demo-web","tutor-demo-canva","tutor-demo-poster",
  "tutor-demo-tgat","tutor-demo-presentation"
]);
function tutorPhoto(tutor) {
  if (!knownTutorPhotos.has(tutor.id)) return "";
  return '<span class="tutor-photo" data-tutor-photo="' + html(tutor.id) + '" aria-hidden="true"></span>';
}
function tutorCard(tutor) {
  const category = tutorCategory(tutor);
  const subject = tutorSubjects[category];
  const owner = state.students[tutor.owner];
  const isMine = canPostTutor() && tutor.owner === state.studentId;
  const reqCount = tutor.requests?.length || 0;
  const reviewCount = tutor.reviews?.length || 0;
  return '<article class="panel tutor-card' + (isMine ? ' is-own-tutor' : '') + '" data-subject="' + category + '">' +
    '<div class="tutor-card-photo" aria-hidden="true">' + tutorPhoto(tutor) + '</div>' +
    '<div class="tutor-card-band">' +
      icon(subject.icon) + '<span>' + html(subject.label) + '</span>' +
      (isMine ? '<span class="tutor-own-chip">ประกาศของฉัน</span>' : '') +
    '</div>' +
    '<h3>' + html(tutor.subject) + '</h3>' +
    '<p class="tutor-card-owner">' + (owner ? studentAvatar(owner) : '') + '<span>' + html(tutorOwner(tutor)) + (isMine ? ' (คุณ)' : '') + '</span></p>' +
    '<div class="pills">' + tag(tutor.level) + tag(tutorFormats[tutor.format]) +
      (isMine && reqCount > 0 ? tag(reqCount + " คำขอติดต่อ", "good") : "") +
      (reviewCount > 0 ? tag("★ " + (tutor.reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviewCount).toFixed(1) + " (" + reviewCount + ")", "info") : "") +
    '</div>' +
    '<p class="tutor-card-time">' + icon("clock") + html(tutor.availability) + '</p>' +
    '<div class="tutor-card-footer"><p class="pay">' + html(currency(tutor.rate)) + ' / ชม.</p>' +
      (isMine
        ? '<div class="tutor-card-own-actions">' +
            button("จัดการ/ดูคำขอ","tutor-detail","secondary",tutor.id) +
            button("แก้ไข","edit-tutor","quiet",tutor.id) +
          '</div>'
        : button("ดูโปรไฟล์","tutor-detail","secondary",tutor.id)) +
    '</div></article>';
}

function tutorDirectory() {
  const criteria = selected.criteria || {};
  const qTerm = String(criteria.q || "").trim().toLowerCase();
  const tutorScope = selected.tutorScope === "mine" ? "mine" : "all";
  const allMatched = state.tutors.filter(tutor =>
    (!qTerm || [
      tutor.subject,
      tutorOwner(tutor),
      tutorSubjects[tutorCategory(tutor)].label,
      tutor.level,
      tutorFormats[tutor.format],
      tutor.experience,
      tutor.availability,
      tutor.bannerText || ""
    ].join(" ").toLowerCase().includes(qTerm)) &&
    (!criteria.category || tutorCategory(tutor) === criteria.category) &&
    (!criteria.level || tutor.level === criteria.level) &&
    (!criteria.format || tutor.format === criteria.format || tutor.format === "both") &&
    (!criteria.max || tutor.rate <= Number(criteria.max)));
  const own = canPostTutor() ? state.tutors.filter(tutor => tutor.owner === state.studentId) : [];
  const totalOwnReqs = own.reduce((sum, t) => sum + (t.requests?.length || 0), 0);
  // Keep owner's own posts easy to spot at the top when viewing "all", or filter exclusively when "mine"
  const list = (tutorScope === "mine" && own.length
    ? allMatched.filter(t => t.owner === state.studentId)
    : [...allMatched].sort((a, b) => {
        const aOwn = canPostTutor() && a.owner === state.studentId ? 0 : 1;
        const bOwn = canPostTutor() && b.owner === state.studentId ? 0 : 1;
        return aOwn - bOwn;
      }));
  const minRate = state.tutors.length ? Math.min(...state.tutors.map(t => Number(t.rate) || 0).filter(Boolean)) : 120;
  const activeFilterCount = ["category", "level", "format", "max"].filter(k => Boolean(criteria[k])).length;
  const heroArt = headerMascotSrc();
  const myTutorSpotlight = own.length
    ? '<section class="panel my-tutors-spotlight" aria-label="ประกาศรับสอนของฉัน">' +
        '<div class="my-tutors-head">' +
          '<div>' +
            '<div class="my-tutors-title-row">' +
              '<span class="tutor-own-chip">ประกาศของฉัน</span>' +
              '<h2>ประกาศรับสอนที่คุณลงไว้ (' + own.length + ')</h2>' +
            '</div>' +
            '<p class="helper">เห็นและจัดการโพสต์ของคุณได้ทันทีจากด้านบน · คำขอติดต่อรวม ' + totalOwnReqs + ' รายการ</p>' +
          '</div>' +
          navButton("+ ลงประกาศเพิ่ม","tutor-editor","secondary") +
        '</div>' +
        '<div class="my-tutors-list">' +
          own.map(tutor => {
            const reqs = tutor.requests?.length || 0;
            const revs = tutor.reviews?.length || 0;
            return '<div class="my-tutor-row">' +
              '<div class="my-tutor-row-info">' +
                '<div class="my-tutor-row-top">' +
                  '<strong>' + html(tutor.subject) + '</strong>' +
                  tag(currency(tutor.rate) + " / ชม.", "info") +
                  tag(reqs + " คำขอติดต่อ", reqs > 0 ? "good" : "") +
                  (revs > 0 ? tag(revs + " รีวิว") : "") +
                '</div>' +
                '<p class="helper">' + html(tutorSubjects[tutorCategory(tutor)].label) + ' · ' + html(tutor.level) + ' · ' + html(tutorFormats[tutor.format]) + ' · ' + html(tutor.availability) + '</p>' +
              '</div>' +
              '<div class="my-tutor-row-actions">' +
                button("ดูคำขอ/รีวิว","tutor-detail","secondary",tutor.id) +
                button("แก้ไข","edit-tutor","secondary",tutor.id) +
                button("ลบ","delete-tutor","danger",tutor.id) +
              '</div>' +
            '</div>';
          }).join("") +
        '</div>' +
      '</section>'
    : "";
  const scopeTabs = own.length
    ? '<div class="tutor-scope-tabs" role="tablist" aria-label="สลับดูประกาศติวเตอร์">' +
        '<button type="button" data-action="tutor-scope" data-id="all" aria-pressed="' + (tutorScope === "all") + '">ประกาศทั้งหมด (' + allMatched.length + ')</button>' +
        '<button type="button" data-action="tutor-scope" data-id="mine" aria-pressed="' + (tutorScope === "mine") + '">เฉพาะประกาศของฉัน (' + own.length + ')</button>' +
      '</div>'
    : "";
  return (!state.signedIn ? '<div class="back">' + navButton("หน้าแรก HappiU","landing","text-button") + '</div>' : '') +
    '<section class="pagehead pagehead-illustrated tutor-hero-rich" data-page="tutors">' +
      '<div class="tutor-hero-copy">' +
        '<span class="tutor-hero-eyebrow"><span class="nu-ios-dot" aria-hidden="true"></span>ติวเตอร์นิสิต มอนอ • มหาวิทยาลัยนเรศวร</span>' +
        '<h1>หาติวเตอร์</h1>' +
        '<p>เรียนตัวต่อตัวหรือกลุ่มเล็กกับรุ่นพี่และนิสิต มน. เลือกได้ทั้งออนไลน์และในมหาวิทยาลัย</p>' +
        '<div class="tutor-hero-stats">' +
          '<span><strong>' + state.tutors.length + '</strong> ติวเตอร์พร้อมสอน</span>' +
          '<span>เริ่มต้น <strong>' + minRate + '</strong> บาท/ชม.</span>' +
          (own.length ? '<span class="is-own-stat">ของคุณ <strong>' + own.length + '</strong> ประกาศ</span>' : '<span>ออนไลน์ &amp; ในมอ</span>') +
        '</div>' +
        (canPostTutor() || !state.signedIn
          ? '<div class="tutor-hero-cta">' + navButton("ลงประกาศรับสอน","tutor-editor","primary") + '</div>'
          : '') +
      '</div>' +
      (heroArt ? '<div class="tutor-hero-visual" aria-hidden="true"><img class="pagehead-art" src="' + heroArt + '" alt=""></div>' : '') +
    '</section>' +
    myTutorSpotlight +
    '<section class="panel tutor-search">' +
      '<form data-form="tutor-search">' +
        '<div class="tutor-smart-search-row">' +
          '<label class="field tutor-search-main-input"><span class="sr-only">ค้นหาติวเตอร์</span>' +
            '<input type="search" name="q" value="' + html(criteria.q || "") + '" maxlength="100" placeholder="พิมพ์ชื่อวิชา ชื่อติวเตอร์ ระดับชั้น หรือรูปแบบที่ต้องการ เช่น Python ออนไลน์, คณิต ม.ต้น...">' +
          '</label>' +
          '<button class="primary" type="submit">ค้นหาติวเตอร์</button>' +
        '</div>' +
        '<details class="tutor-filter-collapse"' + (activeFilterCount ? ' open' : '') + '>' +
          '<summary>ตัวกรองเพิ่มเติม' + (activeFilterCount ? ' (' + activeFilterCount + ' ค่าที่เลือก)' : ' (ค่าพื้นฐาน: ทั้งหมด)') + '</summary>' +
          '<div class="field-grid tutor-field-row">' +
            selectField("หมวดวิชา","category",[["","ทุกหมวดวิชา"],...Object.entries(tutorSubjects).map(([id,subject])=>[id,subject.label])],criteria.category || "") +
            selectField("ระดับผู้เรียน","level",[["","ทุกระดับ"],...tutorLevels.map(level=>[level,level])],criteria.level || "") +
            selectField("รูปแบบ","format",[["","ทุกรูปแบบ"],["online",tutorFormats.online],["inPerson",tutorFormats.inPerson]],criteria.format || "") +
            field("ราคาสูงสุด (บาท/ชม.)","max",criteria.max || "","number",'min=0 max=10000 placeholder="ไม่จำกัด"') +
          '</div>' +
        '</details>' +
        '<p class="helper" role="alert" data-form-error></p>' +
      '</form>' +
    '</section>' +
    '<div class="section-head tutor-dir-head"><div><h2>' + (tutorScope === "mine" ? "ประกาศรับสอนของฉัน" : "ประกาศรับสอนทั้งหมด") + '</h2><span class="helper">' + list.length + ' รายการ' + (own.length && tutorScope === "all" ? ' · แสดงประกาศของคุณไว้ด้านบนสุด' : '') + '</span></div>' + scopeTabs + '</div>' +
    (list.length ? '<div class="tutor-grid">' + list.map(tutorCard).join("") + '</div>'
      : empty("ไม่พบติวเตอร์ตามข้อความที่ค้นหา","ลองค้นหาด้วยคำอื่น หรือรีเซ็ตตัวกรองเพิ่มเติม"));
}

function tutorDetail() {
  const tutor = tutorBy(selected.tutor);
  if (!tutor) return empty("ไม่พบประกาศติวเตอร์","กลับไปค้นหาประกาศอื่น",navButton("หาติวเตอร์","tutors"));
  const owns = canPostTutor() && tutor.owner === state.studentId;
  const ownerProfile = state.students[tutor.owner];
  const reviews = Array.isArray(tutor.reviews) ? tutor.reviews : [];
  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;
  const hasBannerImg = validPhoto(tutor.bannerUrl);
  const bannerHtml =
    '<section class="tutor-custom-banner' + (hasBannerImg ? ' has-photo' : '') + '">' +
      (hasBannerImg ? '<img class="tutor-banner-img" src="' + html(tutor.bannerUrl) + '" alt="แบนเนอร์คอร์ส ' + html(tutor.subject) + '">' : '') +
      '<div class="tutor-banner-overlay">' +
        '<div class="pills">' +
          '<span class="tag info">' + html(tutorSubjects[tutorCategory(tutor)].label) + '</span>' +
          (owns ? '<span class="tutor-own-chip">ประกาศรับสอนของคุณ</span>' : '') +
        '</div>' +
        '<h2>' + html(tutor.subject) + '</h2>' +
        '<p>' + html(tutor.bannerText || ('สอนโดย ' + tutorOwner(tutor) + ' · ' + tutorFormats[tutor.format] + ' · ' + currency(tutor.rate) + '/ชม.')) + '</p>' +
      '</div>' +
    '</section>';

  const reviewsHtml = panel(
    '<div class="tutor-reviews-head"><h2>รีวิวและประสบการณ์จากผู้เรียน</h2>' +
      (avgRating ? '<span class="tutor-rating-pill">★ ' + html(avgRating) + ' / 5 (' + reviews.length + ' รีวิว)</span>' : '<span class="helper">ยังไม่มีรีวิว</span>') +
    '</div>' +
    (reviews.length
      ? '<div class="tutor-review-list">' + reviews.map(r =>
          '<article class="tutor-review-item">' +
            '<div class="tutor-review-top"><strong>' + html(r.reviewerName) + '</strong><span class="stars" aria-label="' + html(r.rating) + ' ดาว">' + "★".repeat(r.rating) + "☆".repeat(5 - r.rating) + '</span></div>' +
            '<p>' + html(r.comment) + '</p>' +
          '</article>'
        ).join("") + '</div>'
      : '<p class="helper">เป็นคนแรกที่รีวิวติวเตอร์คนนี้</p>') +
    (!owns ? '<details class="tutor-add-review"><summary>เขียนรีวิวให้ติวเตอร์</summary>' +
      form("tutor-review",
        '<input type="hidden" name="tutorId" value="' + html(tutor.id) + '">' +
        field("ชื่อผู้รีวิว","reviewerName",state.signedIn ? (currentStudent()?.nick || currentStudent()?.name || "") : "","text","required maxlength=60") +
        selectField("คะแนนความพึงพอใจ","rating",[["5","5 ดาว — ดีเยี่ยม"],["4","4 ดาว — ดีมาก"],["3","3 ดาว — ปานกลาง"],["2","2 ดาว — พอใช้"],["1","1 ดาว — ควรปรับปรุง"]],"5") +
        area("ความคิดเห็นเกี่ยวกับการสอน","comment"),
        "ส่งรีวิว") + '</details>' : '')
  );

  return '<div class="back">' + navButton("กลับไปหาติวเตอร์","tutors","text-button") + '</div>' +
    bannerHtml +
    '<div class="two">' +
    panel(
      '<div class="tutor-profile-header">' +
        (ownerProfile ? studentAvatar(ownerProfile, tutorOwner(tutor)) : '') +
        '<div><h3>' + html(tutorOwner(tutor)) + '</h3>' +
        '<p class="helper">' + html(ownerProfile ? (ownerProfile.faculty + ' · ' + ownerProfile.major + ' ปี ' + ownerProfile.year) : 'ติวเตอร์นิสิต มน.') + '</p></div>' +
      '</div>' +
      '<h2>รายละเอียดการสอน</h2>' + dataList([
        ["หมวดวิชา",tutorSubjects[tutorCategory(tutor)].label],["ระดับผู้เรียน",tutor.level],["ราคา",currency(tutor.rate) + " / ชม."],
        ["รูปแบบ",tutorFormats[tutor.format]],["วันและเวลาว่าง",tutor.availability]
      ]) +
      '<div class="tutor-exp-box"><h3>ประสบการณ์และแนวการสอน</h3><p class="tutor-note">' + html(tutor.experience) + '</p></div>' +
      (owns ? actions(button("แก้ไขประกาศ","edit-tutor","secondary",tutor.id) + button("ลบประกาศ","delete-tutor","danger",tutor.id)) : "")
    ) +
    '<div>' +
      (owns ? panel('<h2>คำขอติดต่อ (' + (tutor.requests?.length || 0) + ')</h2>' +
        (tutor.requests?.length ? tutor.requests.map(item=>'<article class="tutor-request"><h3>' +
          html(item.name) + '</h3><p>' + html(item.contact) + '</p><p class="tutor-note">' +
          html(item.message) + '</p></article>').join("") : '<p class="helper">ยังไม่มีคำขอติดต่อ</p>'))
        : panel('<h2>ขอติดต่อติวเตอร์</h2>' +
          '<p class="helper">ส่งข้อมูลช่องทางติดต่อและเวลาที่สะดวก เพื่อให้ติวเตอร์ตอบกลับโดยตรง</p>' +
          form("tutor-contact",field("ชื่อผู้ติดต่อ","name",state.signedIn ? (currentStudent()?.name || "") : "","text","required maxlength=60") +
            field("อีเมลหรือ LINE ID สำหรับตอบกลับ","contact",state.signedIn ? (currentStudent()?.contact || "") : "","text","required maxlength=100") +
            HappiUM1.availabilityField("", { legend: "วันและเวลาที่สะดวกเรียน", helper: "เลือกวันและช่วงเวลาที่สะดวก (ใช้ตัวเลือกวันและเวลาเท่านั้น)", required: true }) +
            area("เรื่องที่อยากเรียนหรือรายละเอียดเพิ่มเติม","message"),"ส่งคำขอติดต่อ"))) +
      reviewsHtml +
    '</div></div>';
}

function tutorEditor() {
  const tutor = tutorBy(selected.tutor);
  if (!canPostTutor() || (selected.tutor && tutor?.owner !== state.studentId)) {
    return empty("เปิดสำหรับบัญชีนิสิต มน.","เข้าสู่ระบบด้วยรหัสนิสิตเพื่อสร้างหรือแก้ไขประกาศรับสอน",navButton("เข้าสู่ระบบ","login","primary"));
  }
  return '<div class="back">' + navButton("กลับไปหาติวเตอร์","tutors","text-button") + '</div>' +
    header(tutor ? "แก้ไขประกาศรับสอน" : "ลงประกาศรับสอน") +
    panel(form("tutor-editor",'<div class="field-grid">' +
      field("วิชาหรือหัวข้อที่สอน","subject",tutor?.subject,"text","required maxlength=80") +
      selectField("หมวดวิชา","category",Object.entries(tutorSubjects).map(([id,subject])=>[id,subject.label]),tutorCategory(tutor || {})) +
      selectField("ระดับผู้เรียน","level",tutorLevels.map(level=>[level,level]),tutor?.level || tutorLevels[1]) +
      field("ราคา (บาท/ชม.)","rate",tutor?.rate || 150,"number","required min=0 max=10000") +
      selectField("รูปแบบ","format",Object.entries(tutorFormats),tutor?.format || "online") +
      '</div>' +
      HappiUM1.availabilityField(tutor?.availability, { legend: "วันและเวลาว่างที่สะดวกสอน", helper: "เลือกวันและช่วงเวลาที่รับสอนได้หลายช่วง (ใช้ตัวเลือกวันและเวลาเท่านั้น)", required: true }) +
      field("คำอธิบายบนแบนเนอร์ด้านบน (ถ้ามี)","bannerText",tutor?.bannerText || "","text",'maxlength="180" placeholder="เช่น ติวเข้มเน้นทำโจทย์จริง มีชีทสรุปให้ฟรี"') +
      '<label class="field">รูปภาพแบนเนอร์ด้านบน (JPG, PNG หรือ WebP)<input type="file" name="bannerPhoto" accept="image/png,image/jpeg,image/webp"><small>แสดงที่ส่วนบนของหน้าติดต่อติวเตอร์ (ไม่เกิน 5 MB)</small></label>' +
      (validPhoto(tutor?.bannerUrl) ? '<label class="share-option"><input type="checkbox" name="removeBanner"> ลบรูปแบนเนอร์ปัจจุบันออก</label>' : '') +
      area("ประสบการณ์และแนวการสอน","experience",tutor?.experience),"เผยแพร่ประกาศ") +
      (tutor ? '<div class="actions" style="margin-top:12px">' + button("ลบประกาศนี้","delete-tutor","danger",tutor.id) + '</div>' : ''));
}

function tutorFields(data, fields) {
  return Object.fromEntries(fields.map(name => [name,String(data.get(name) ?? "").trim()]));
}

function filterTutors(data) {
  go("tutors",{criteria:tutorFields(data,["q","category","level","format","max"])});
}

async function fileToDataUrl(file, maxBytes = 5 * 1024 * 1024) {
  if (!file || !file.name) return "";
  if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > maxBytes) {
    throw new Error("รองรับเฉพาะรูป JPG, PNG หรือ WebP ขนาดไม่เกิน " + Math.round(maxBytes / (1024 * 1024)) + " MB");
  }
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปได้"));
    reader.readAsDataURL(file);
  });
}

async function saveTutor(data,error) {
  if (!canPostTutor()) return error("เข้าสู่ระบบด้วยรหัสนิสิตก่อนลงประกาศ");
  const old = tutorBy(selected.tutor);
  if (selected.tutor && old?.owner !== state.studentId) return error("แก้ได้เฉพาะประกาศของตัวเอง");
  const values = tutorFields(data,["subject","level","rate","format","experience","bannerText"]);
  const availability = HappiUM1.selectedAvailability(data);
  if (availability === null) {
    return error("เลือกวันและช่วงเวลาว่างให้ครบ โดยให้เวลาสิ้นสุดอยู่หลังเวลาเริ่ม");
  }
  if (!availability) {
    return error("กรุณาเลือกวันและช่วงเวลาว่างอย่างน้อย 1 ช่วงเวลา");
  }
  const category = data.get("category") || tutorCategory(old || {});
  const rate = Number(values.rate);
  if (!values.subject || !values.experience || !Object.hasOwn(tutorSubjects,category) || !tutorLevels.includes(values.level) ||
      !Object.hasOwn(tutorFormats,values.format) || !Number.isInteger(rate) || rate < 0 || rate > 10000) {
    return error("กรอกข้อมูลการสอนและราคาต่อชั่วโมงให้ครบ");
  }
  try {
    const bannerFile = data.get("bannerPhoto");
    const bannerDataUrl = bannerFile?.name ? await fileToDataUrl(bannerFile, 5 * 1024 * 1024) : "";
    const res = await HappiUApi.saveTutor({
      id: old?.id || "",
      ...values,
      availability,
      category,
      rate,
      bannerDataUrl,
      removeBanner: data.get("removeBanner") === "on"
    });
    applyServerState(res.state);
    go("tutor-detail",{tutor:res.tutorId});
    announce(old ? "บันทึกการแก้ไขประกาศรับสอนแล้ว" : "เผยแพร่ประกาศรับสอนแล้ว");
  } catch (err) {
    error(err.message || "บันทึกประกาศไม่ได้ กรุณาลองใหม่");
  }
}

async function requestTutor(data,error,formEl) {
  const tutor = tutorBy(selected.tutor);
  if (!tutor || (canPostTutor() && tutor.owner === state.studentId)) return error("เปิดประกาศของติวเตอร์ที่ต้องการติดต่อ");
  const fields = tutorFields(data,["name","contact","message"]);
  const availability = HappiUM1.selectedAvailability(data);
  if (availability === null) {
    return error("เลือกวันและช่วงเวลาที่สะดวกเรียนให้ครบ โดยให้เวลาสิ้นสุดอยู่หลังเวลาเริ่ม");
  }
  if (!availability) {
    return error("กรุณาเลือกวันและช่วงเวลาที่สะดวกเรียนอย่างน้อย 1 ช่วงเวลา");
  }
  if (Object.values(fields).some(value=>!value)) return error("กรอกชื่อ ช่องทางติดต่อ และหัวข้อที่อยากเรียนให้ครบ");
  const payload = {
    ...fields,
    message: ("วันเวลาที่สะดวก: " + availability + "\n" + fields.message).slice(0, 600)
  };
  try {
    const res = await HappiUApi.requestTutor(tutor.id, payload);
    applyServerState(res.state);
    formEl.reset();
    const receipt = document.createElement("p");
    receipt.className = "callout good";
    receipt.tabIndex = -1;
    receipt.textContent = "ส่งคำขอติดต่อติวเตอร์เรียบร้อยแล้ว ติวเตอร์จะเห็นข้อความของคุณในระบบทันที";
    formEl.replaceWith(receipt);
    receipt.focus();
  } catch (err) {
    error(err.message || "ส่งคำขอไม่ได้ กรุณาลองใหม่");
  }
}

async function submitTutorReview(data, error) {
  const tutorId = String(data.get("tutorId") || selected.tutor || "").trim();
  const reviewerName = String(data.get("reviewerName") || "").trim();
  const rating = Number(data.get("rating"));
  const comment = String(data.get("comment") || "").trim();
  if (!reviewerName || !comment) return error("กรอกชื่อและข้อความรีวิวให้ครบ");
  try {
    const res = await HappiUApi.reviewTutor(tutorId, { reviewerName, rating, comment });
    applyServerState(res.state);
    render(false);
    announce("ส่งรีวิวให้ติวเตอร์เรียบร้อยแล้ว");
  } catch (err) {
    error(err.message || "ส่งรีวิวไม่สำเร็จ");
  }
}

const key = "happiu-prototype-v1";
function readState() {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return fresh();
    if (stored.students) return normalizeState(stored);
    const defaults = fresh();
    const oldProfile = stored.profile;
    const placeholder = oldProfile?.name === "นิสิตตัวอย่าง" && oldProfile?.contact === "student@example.com";
    if (oldProfile && !placeholder) Object.assign(defaults.students[firstStudent],oldProfile);
    const storedJobs = Array.isArray(stored.jobs) ? stored.jobs : defaults.jobs;
    const storedApps = Array.isArray(stored.applications) ? stored.applications : [];
    const storedReports = Array.isArray(stored.reports) ? stored.reports : [];
    const previousApps = storedApps.map(app => ({
      ...app, student:firstStudent,
      profile: applicationProfile(defaults.students[firstStudent])
    }));
    const demoApps = defaults.applications.filter(app =>
      !previousApps.some(previous => previous.student === app.student && previous.job === app.job && previous.shift === app.shift) &&
      (app.status !== "accepted" || previousApps.filter(previous =>
        previous.job === app.job && previous.shift === app.shift && previous.status === "accepted"
      ).length < storedJobs.find(job=>job?.id===app.job)?.shifts?.find(shift=>shift?.id===app.shift)?.capacity)
    );
    const {profile, ...rest} = stored;
    return normalizeState({...rest, jobs:storedJobs, studentId:firstStudent, students:defaults.students, applications:[...previousApps,...demoApps],
      reports:storedReports.map(report=>({...report,student:firstStudent}))});
  } catch { return fresh(); }
}
function normalizeState(stored) {
  if (!Array.isArray(stored.tutors)) stored.tutors = [];
  for (const fixture of tutorFixtures) {
    const saved = stored.tutors.find(tutor => tutor.id === fixture.id);
    if (!saved) stored.tutors.push(structuredClone(fixture));
    else {
      if (!Object.hasOwn(saved,"category")) saved.category = fixture.category;
      const availCheck = HappiUM1.validateAndNormalizeAvailability(saved.availability, { required: true });
      if (!availCheck.ok || !stored.availabilityCanonicalVersion) {
        saved.availability = availCheck.ok ? availCheck.value : fixture.availability;
      }
    }
  }
  for (const [id,employer] of Object.entries(addedEmployers)) {
    if (!Object.hasOwn(stored.employers,id)) stored.employers[id] = structuredClone(employer);
  }
  for (const job of extraDemoJobs) {
    if (Array.isArray(stored.jobs) && stored.employers?.[job.employer] &&
        !stored.jobs.some(saved => saved?.id === job.id)) {
      stored.jobs.push(structuredClone(job));
    }
  }
  stored.students[newStudent] ??= structuredClone(studentFixtures[newStudent]);
  for (const [id,student] of Object.entries(stored.students)) {
    const record = studentFixtures[id];
    if (!record) continue;
    if (!Object.hasOwn(student,"photo")) student.photo = record.photo;
    if (!stored.skillMatchingVersion && id === "thanwa" && ["บริการลูกค้า, จัดการข้อมูล",
      "บริการลูกค้า, จัดการข้อมูล, Excel, คีย์ข้อมูล, พิมพ์เอกสาร, แก้ปัญหาคอมพิวเตอร์"].includes(student.skills)) {
      student.skills = record.skills;
    }
    if (id === "thanwa" && student.interests?.join("|") === "งานในมหาวิทยาลัย|ออนไลน์") student.interests = [...record.interests];
    if (!Array.isArray(student.interests)) {
      student.interests = [...(record.interests || HappiUM1.SEED_STUDENT_INTERESTS[id] || [])];
    }
    for (const field of ["name","code","major","year","faculty","schedule","contact"]) student[field] = record[field];
    const stuAvail = HappiUM1.validateAndNormalizeAvailability(student.availability, { required: false });
    if (!stuAvail.ok) student.availability = record.availability;
    else student.availability = stuAvail.value;
  }
  for (const job of stored.jobs || []) {
    if (job) job.payType = HappiUM2.normalizePayType(job);
    if (!stored.skillMatchingVersion && job?.id === "demo-office-excel" && job.requiredSkills === "Excel" &&
        job.skills === "จัดการข้อมูล, คีย์ข้อมูล, พิมพ์เอกสาร, จัดแฟ้ม") {
      const fixture = extraDemoJobs.find(item => item.id === job.id);
      Object.assign(job,{skills:fixture.skills, requiredSkills:fixture.requiredSkills});
    }
  }
  for (const app of stored.applications || []) {
    const record = stored.students[app.student];
    if (!record) continue;
    const snapshot = app.profile || {};
    app.profile = applicationProfile({...snapshot,name:record.name,major:record.major,year:record.year},Object.keys(snapshot));
    if (["pending","withdrawn","offer_declined"].includes(app.status)) delete app.shift;
    app.studentReview = app.studentReview || null;
    app.employerReview = app.employerReview || null;
  }
  stored.skillMatchingVersion = 1;
  stored.availabilityCanonicalVersion = 1;
  return stored;
}

function a () {
  console.log(this.name)
}
function gz_need_deleted () {
  console.log(this.name)
  function gz_change_name () {
    console.log(`gz_change_name`)
  }
  gz_change_name()
}
function b () {
  console.log(this.name)
}

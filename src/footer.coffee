###
canarium.jsの末端に配置されるスクリプト。
ロードの最終処理や後始末などを記述する。
###

# canarium.jsロード前のproperty定義に戻す
# (待避する処理はheader.coffeeで行う)
if oldProperty?
  Function::property = oldProperty
else
  delete Function::property

# クラスCanariumをグローバル名前空間(this==window)に公開する。
this.Canarium = Canarium


# cockpit-speedtest — Cockpit 向けインターネット速度テスト拡張
#
# 使い方:
#   make install        システム全体にインストール (/usr/share/cockpit/speedtest)
#   make devel-install  開発用に現在のユーザーへシンボリックリンクで導入
#   make devel-uninstall
#   make check          構文チェックと単体テスト

APP := speedtest
FILES := manifest.json index.html index.css index.js speedtest.js

PREFIX ?= /usr
DATADIR ?= $(PREFIX)/share/cockpit
DESTDIR ?=

.PHONY: all install devel-install devel-uninstall check deb

all:
	@echo "make install / make devel-install / make check / make deb のいずれかを指定してください"

install:
	install -d $(DESTDIR)$(DATADIR)/$(APP)
	install -m 0644 $(FILES) $(DESTDIR)$(DATADIR)/$(APP)/

devel-install:
	mkdir -p ~/.local/share/cockpit
	ln -sfn $(CURDIR) ~/.local/share/cockpit/$(APP)

devel-uninstall:
	rm -f ~/.local/share/cockpit/$(APP)

check:
	node --check index.js
	node --check speedtest.js
	node --test test/*.js
	python3 -m json.tool manifest.json > /dev/null
	@echo "check OK"

# Ubuntu 24.04 向け .deb パッケージをビルドする（debhelper が必要）
# 成果物は1つ上のディレクトリに cockpit-speedtest_*_all.deb として作られる
deb:
	dpkg-buildpackage -us -uc -b
